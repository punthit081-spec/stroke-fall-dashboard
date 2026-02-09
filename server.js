const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const checklistDefinition = require('./checklist-definition');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/cauti-vap', express.static(path.join(__dirname, 'public')));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const checklistItems = [...checklistDefinition.cauti.items, ...checklistDefinition.vap.items];
const checklistKeys = checklistItems.map((item) => item.key);
const itemTextByKey = Object.fromEntries(checklistItems.map((item) => [item.key, item.text]));

function ensureSupabase(res) {
  if (!supabase) {
    res.status(500).json({ error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).' });
    return false;
  }
  return true;
}

app.get('/api/checklist-definition', (_, res) => {
  res.json(checklistDefinition);
});

app.get('/api/patients', async (req, res) => {
  if (!ensureSupabase(res)) return;

  let query = supabase.from('patients').select('bed_no, hn, patient_name').order('bed_no', { ascending: true });

  if (req.query.bed) {
    query = query.eq('bed_no', req.query.bed);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

app.post('/api/checklist', async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { bed_no, hn, assessments } = req.body;
  if (!bed_no || !hn || !assessments) {
    res.status(400).json({ error: 'bed_no, hn and assessments are required.' });
    return;
  }

  const assessmentDate = new Date().toISOString().slice(0, 10);
  const payload = { assessment_date: assessmentDate, bed_no, hn };

  for (const key of checklistKeys) {
    if (typeof assessments[key] !== 'boolean') {
      res.status(400).json({ error: `Assessment item ${key} must be boolean.` });
      return;
    }
    payload[key] = assessments[key];
  }

  const { data, error } = await supabase.from('checklist_records').insert(payload).select().single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

app.get('/api/records', async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { date, bed, hn, startDate, endDate, format } = req.query;

  let query = supabase
    .from('checklist_records')
    .select('*')
    .order('assessment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (date) query = query.eq('assessment_date', date);
  if (bed) query = query.eq('bed_no', bed);
  if (hn) query = query.ilike('hn', `%${hn}%`);
  if (startDate) query = query.gte('assessment_date', startDate);
  if (endDate) query = query.lte('assessment_date', endDate);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (format === 'csv') {
    const headers = ['assessment_date', 'bed_no', 'hn', ...checklistKeys];
    const rows = data.map((row) => headers.map((h) => row[h]));
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cauti-vap-records-${Date.now()}.csv"`);
    res.send(csv);
    return;
  }

  res.json(data);
});


app.delete('/api/records/:id', async (req, res) => {
  if (!ensureSupabase(res)) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid record id.' });
    return;
  }

  const { data, error } = await supabase
    .from('checklist_records')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Record not found.' });
    return;
  }

  res.json({ success: true, id });
});

app.get('/api/analytics', async (req, res) => {
  if (!ensureSupabase(res)) return;

  const { startDate, endDate, section } = req.query;

  let keys = checklistKeys;
  if (section === 'cauti') keys = checklistDefinition.cauti.items.map((item) => item.key);
  if (section === 'vap') keys = checklistDefinition.vap.items.map((item) => item.key);

  let query = supabase.from('checklist_records').select(['assessment_date', ...keys].join(','));

  if (startDate) query = query.gte('assessment_date', startDate);
  if (endDate) query = query.lte('assessment_date', endDate);

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const totalRecords = data.length;
  const items = keys.map((key) => {
    const yesCount = data.filter((row) => row[key] === true).length;
    const noCount = data.filter((row) => row[key] === false).length;
    const yesPercent = totalRecords > 0 ? Number(((yesCount / totalRecords) * 100).toFixed(2)) : 0;
    const noPercent = totalRecords > 0 ? Number(((noCount / totalRecords) * 100).toFixed(2)) : 0;

    return {
      key,
      text: itemTextByKey[key],
      yesCount,
      noCount,
      totalRecords,
      yesPercent,
      noPercent
    };
  });

  const mostProblematic = items.reduce((worst, item) => {
    if (!worst || item.noPercent > worst.noPercent) return item;
    return worst;
  }, null);

  res.json({
    startDate: startDate || null,
    endDate: endDate || null,
    section: section || 'all',
    totalRecords,
    mostProblematic,
    items
  });
});

app.get('/cauti-vap', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cauti-vap/*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (_, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
