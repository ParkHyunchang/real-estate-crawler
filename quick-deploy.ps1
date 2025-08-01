# 빠른 배포 스크립트 (Windows PowerShell)

Write-Host "=== 빠른 배포 시작 ===" -ForegroundColor Green

# 컨테이너만 재시작 (이미지 재빌드 없이)
Write-Host "컨테이너 재시작 중..." -ForegroundColor Yellow
docker-compose restart

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== 빠른 배포 완료! ===" -ForegroundColor Green
    Write-Host "애플리케이션 URL: http://125.141.20.218:3300" -ForegroundColor Cyan
    
    # 컨테이너 상태 확인
    Write-Host "`n컨테이너 상태:" -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host "`n로그 확인: docker-compose logs -f real_estate_crawler" -ForegroundColor Gray
} else {
    Write-Host "컨테이너 재시작 실패! 전체 빌드가 필요할 수 있습니다." -ForegroundColor Red
    Write-Host "전체 빌드를 원하시면: .\real_estate_crawler_deploy.sh" -ForegroundColor Yellow
} 