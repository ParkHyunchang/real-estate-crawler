# Real Estate Crawler Docker 배포 가이드

## 개요
이 프로젝트는 부동산 정보를 크롤링하는 Node.js 애플리케이션입니다. Docker를 사용하여 쉽게 배포할 수 있습니다.

## 시스템 요구사항
- Docker
- Docker Compose

## 배포 방법

### Windows PowerShell 사용
```powershell
# PowerShell에서 실행
.\build-and-package.ps1
```

### Linux/Mac 사용
```bash
# 실행 권한 부여
chmod +x real_estate_crawler_deploy.sh

# 배포 스크립트 실행
./real_estate_crawler_deploy.sh
```

### 수동 배포
```bash
# 1. 기존 컨테이너 정리
docker-compose down --rmi all --volumes --remove-orphans

# 2. Docker 이미지 빌드
docker-compose build --no-cache

# 3. 컨테이너 실행
docker-compose up -d
```

## 접속 정보
- **애플리케이션 URL**: http://localhost:3300
- **API 포트**: 3300

## API 엔드포인트

### 1. 단지 검색
```
GET /api/complex?name=<단지명>
```

### 2. 단지 검색 + 매물 정보 조회
```
GET /api/complex/properties?name=<단지명>
POST /api/complex/properties
```

### 3. 단지 번호로 매물 정보 조회
```
GET /api/complex/:complexNo/properties
```

## 컨테이너 관리

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 로그 확인
```bash
docker-compose logs -f real_estate_crawler
```

### 컨테이너 중지
```bash
docker-compose down
```

### 컨테이너 재시작
```bash
docker-compose restart
```

## 문제 해결

### 포트 충돌 시
포트 3300이 이미 사용 중인 경우, `docker-compose.yml` 파일에서 포트를 변경하세요:
```yaml
ports:
  - "3301:3000"  # 3300을 3301로 변경
```

### 메모리 부족 시
Puppeteer가 많은 메모리를 사용할 수 있습니다. Docker 컨테이너에 메모리 제한을 설정하세요:
```yaml
services:
  real_estate_crawler:
    # ... 기존 설정 ...
    deploy:
      resources:
        limits:
          memory: 2G
```

## 파일 수정 후 재배포 방법

### 1. 로컬에서 파일 수정
```bash
# 로컬에서 파일 수정 후
cd real-estate-crawler
# 파일 수정 (app.js, crawler.js, public/ 등)
```

### 2. NAS로 파일 업로드
**FileZilla 사용:**
- 로컬: `C:\Users\hyunc\personal_project\real-estate-crawler\`
- 원격: `/volume1/docker/real-estate-crawler/`
- 수정된 파일들만 업로드

### 3. NAS에서 재배포

#### 빠른 배포 (권장)
```bash
# NAS에 SSH 접속
ssh hyunchang88@125.141.20.218

# real-estate-crawler 폴더로 이동
cd /volume1/docker/real-estate-crawler

# 빠른 재배포 (컨테이너만 재시작)
./quick-deploy.sh
```

#### 전체 재배포 (필요시)
```bash
# 전체 빌드 및 재배포
./real_estate_crawler_deploy.sh
```

### 4. 배포 확인
```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f real_estate_crawler

# 브라우저에서 접속 테스트
# http://125.141.20.218:3300
```

## 배포 방법 비교

### 빠른 배포 (권장)
- **시간**: 5-10초
- **용도**: HTML/CSS/JS 파일 수정 시
- **명령어**: `./quick-deploy.sh`
- **동작**: 컨테이너만 재시작

### 전체 배포
- **시간**: 2-5분
- **용도**: package.json 변경, 새로운 의존성 추가 시
- **명령어**: `./real_estate_crawler_deploy.sh`
- **동작**: 이미지 재빌드 + 컨테이너 재시작

## 파일 구조
```
real-estate-crawler/
├── Dockerfile              # Docker 이미지 정의
├── docker-compose.yml      # Docker Compose 설정
├── .dockerignore          # Docker 빌드 시 제외할 파일들
├── build-and-package.ps1  # Windows 배포 스크립트
├── real_estate_crawler_deploy.sh  # Linux 배포 스크립트
├── quick-deploy.sh        # 빠른 배포 스크립트
├── quick-deploy.ps1       # Windows 빠른 배포 스크립트
├── app.js                 # 메인 애플리케이션
├── crawler.js             # 크롤링 로직
├── package.json           # Node.js 의존성
└── public/                # 정적 파일들
``` 