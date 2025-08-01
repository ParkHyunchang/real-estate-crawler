# Real Estate Crawler Docker 빌드 및 실행 스크립트

Write-Host "=== Real Estate Crawler Docker 빌드 시작 ===" -ForegroundColor Green

# 기존 컨테이너와 이미지 정리
Write-Host "기존 컨테이너와 이미지 정리 중..." -ForegroundColor Yellow
docker-compose down --rmi all --volumes --remove-orphans 2>$null
docker rmi real_estate_crawler:latest 2>$null

# Docker 이미지 빌드
Write-Host "Docker 이미지 빌드 중..." -ForegroundColor Yellow
docker-compose build --no-cache

if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker 이미지 빌드 성공!" -ForegroundColor Green
    
    # 컨테이너 실행
    Write-Host "컨테이너 실행 중..." -ForegroundColor Yellow
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "=== 빌드 및 실행 완료! ===" -ForegroundColor Green
        Write-Host "애플리케이션 URL: http://localhost:3300" -ForegroundColor Cyan
        Write-Host "API 엔드포인트:" -ForegroundColor Cyan
        Write-Host "  - GET  /api/complex?name=<단지명>" -ForegroundColor White
        Write-Host "  - GET  /api/complex/properties?name=<단지명>" -ForegroundColor White
        Write-Host "  - POST /api/complex/properties" -ForegroundColor White
        Write-Host "  - GET  /api/complex/:complexNo/properties" -ForegroundColor White
        
        # 컨테이너 상태 확인
        Write-Host "`n컨테이너 상태:" -ForegroundColor Yellow
        docker-compose ps
    } else {
        Write-Host "컨테이너 실행 실패!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Docker 이미지 빌드 실패!" -ForegroundColor Red
    exit 1
} 