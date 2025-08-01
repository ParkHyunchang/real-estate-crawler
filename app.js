const express = require('express');
const { getNaverAptComplexCode, getComplexPropertyInfo, searchComplexAndGetProperties } = require('./crawler');

const app = express();
const PORT = 3000;

// 정적 파일 제공
app.use(express.static('public'));

// JSON 파싱을 위한 미들웨어 추가
app.use(express.json());

// 기존 단지 검색 API
app.get('/api/complex', async (req, res) => {
  const { name } = req.query; // ✅ GET 쿼리에서 name 추출
  if (!name) return res.status(400).json({ error: 'Missing name parameter' });

  try {
    const result = await getNaverAptComplexCode(name);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 새로운 API: 단지 검색 + 매물 정보 조회
app.get('/api/complex/properties', async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Missing name parameter' });

  try {
    const result = await searchComplexAndGetProperties(name);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST 방식으로도 지원
app.post('/api/complex/properties', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name parameter' });

  try {
    const result = await searchComplexAndGetProperties(name);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 단지 번호로 직접 매물 정보 조회
app.get('/api/complex/:complexNo/properties', async (req, res) => {
  const { complexNo } = req.params;
  if (!complexNo) return res.status(400).json({ error: 'Missing complexNo parameter' });

  try {
    const result = await getComplexPropertyInfo(complexNo);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/complex?name=<단지명> - 단지 검색');
  console.log('  GET  /api/complex/properties?name=<단지명> - 단지 검색 + 매물 정보');
  console.log('  POST /api/complex/properties - 단지 검색 + 매물 정보 (POST)');
  console.log('  GET  /api/complex/:complexNo/properties - 단지 번호로 매물 정보 조회');
});
