# 🏠 네이버 부동산 크롤러

네이버 부동산에서 단지명을 입력하면 해당 단지의 `complexNo`를 찾고, 그 단지의 매물 정보를 가져오는 프로그램입니다.

## 📋 기능

- **단지 검색**: 단지명으로 검색하여 `complexNo` 찾기
- **매물 정보 조회**: `complexNo`를 이용하여 해당 단지의 매물 정보 가져오기
- **통합 검색**: 단지명 입력 → `complexNo` 찾기 → 매물 정보 조회 (한 번에)

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 서버 실행
```bash
node app.js
```

### 3. 웹 인터페이스 접속
브라우저에서 `http://localhost:3000` 접속

## 📡 API 엔드포인트

### 1. 단지 검색
```
GET /api/complex?name=<단지명>
```

**응답 예시:**
```json
{
  "name": "반포자이",
  "complexNo": "12345"
}
```

### 2. 단지 검색 + 매물 정보 조회
```
GET /api/complex/properties?name=<단지명>
POST /api/complex/properties
```

**POST 요청 본문:**
```json
{
  "name": "반포자이"
}
```

**응답 예시:**
```json
{
  "searchKeyword": "반포자이",
  "complexInfo": {
    "name": "반포자이",
    "complexNo": "12345"
  },
  "propertyInfo": {
    "complexInfo": { /* 단지 상세 정보 */ },
    "properties": { /* 매물 정보 */ }
  }
}
```

### 3. 단지 번호로 직접 매물 정보 조회
```
GET /api/complex/:complexNo/properties
```

## 🎯 사용 예시

### cURL을 이용한 테스트

#### 단지 검색
```bash
curl "http://localhost:3000/api/complex?name=반포자이"
```

#### 단지 + 매물 정보 검색
```bash
curl "http://localhost:3000/api/complex/properties?name=반포자이"
```

#### POST 방식으로 매물 정보 검색
```bash
curl -X POST "http://localhost:3000/api/complex/properties" \
  -H "Content-Type: application/json" \
  -d '{"name": "반포자이"}'
```

#### 단지 번호로 매물 정보 조회
```bash
curl "http://localhost:3000/api/complex/12345/properties"
```

## 🔧 기술 스택

- **Node.js**: 서버 런타임
- **Express**: 웹 프레임워크
- **Puppeteer**: 웹 스크래핑
- **Axios**: HTTP 클라이언트

## 📁 프로젝트 구조

```
real-estate-crawler/
├── app.js              # Express 서버
├── crawler.js          # 크롤링 로직
├── package.json        # 의존성 관리
├── public/
│   └── index.html      # 웹 인터페이스
└── README.md          # 프로젝트 문서
```

## ⚠️ 주의사항

1. **네이버 부동산 정책 준수**: 과도한 요청은 차단될 수 있습니다.
2. **개인정보 보호**: 수집된 정보는 개인적인 용도로만 사용하세요.
3. **API 변경**: 네이버 부동산 API가 변경될 수 있으므로 주기적으로 확인이 필요합니다.

## 🐛 문제 해결

### 서버가 시작되지 않는 경우
- Node.js가 설치되어 있는지 확인
- `npm install`로 의존성이 설치되었는지 확인

### 크롤링이 실패하는 경우
- 네트워크 연결 상태 확인
- 네이버 부동산 사이트 접근 가능 여부 확인
- 단지명이 정확한지 확인

## 📝 라이선스

이 프로젝트는 개인 학습 목적으로 제작되었습니다. 