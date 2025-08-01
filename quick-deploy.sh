#!/bin/bash

# 빠른 배포 스크립트 (파일 변경 시에만 재빌드)

echo "=== 빠른 배포 시작 ==="

# 1. 컨테이너만 재시작 (이미지 재빌드 없이)
echo "컨테이너 재시작 중..."
docker-compose restart

if [ $? -eq 0 ]; then
    echo "=== 빠른 배포 완료! ==="
    echo "애플리케이션 URL: http://125.141.20.218:3300"
    
    # 컨테이너 상태 확인
    echo ""
    echo "컨테이너 상태:"
    docker-compose ps
    
    echo ""
    echo "로그 확인: docker-compose logs -f real_estate_crawler"
else
    echo "컨테이너 재시작 실패! 전체 빌드가 필요할 수 있습니다."
    echo "전체 빌드를 원하시면: ./real_estate_crawler_deploy.sh"
fi 