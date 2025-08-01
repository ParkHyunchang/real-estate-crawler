#!/bin/bash

# Real Estate Crawler Docker 배포 스크립트

echo "=== Real Estate Crawler Docker 배포 시작 ==="

# 기존 컨테이너와 이미지 정리
echo "기존 컨테이너와 이미지 정리 중..."
docker-compose down --rmi all --volumes --remove-orphans 2>/dev/null
docker rmi real_estate_crawler:latest 2>/dev/null

# Docker 이미지 빌드
echo "Docker 이미지 빌드 중..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "Docker 이미지 빌드 성공!"
    
    # 컨테이너 실행
    echo "컨테이너 실행 중..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "=== 배포 완료! ==="
        echo "애플리케이션 URL: http://localhost:3300"
        echo "API 엔드포인트:"
        echo "  - GET  /api/complex?name=<단지명>"
        echo "  - GET  /api/complex/properties?name=<단지명>"
        echo "  - POST /api/complex/properties"
        echo "  - GET  /api/complex/:complexNo/properties"
        
        # 컨테이너 상태 확인
        echo ""
        echo "컨테이너 상태:"
        docker-compose ps
    else
        echo "컨테이너 실행 실패!"
        exit 1
    fi
else
    echo "Docker 이미지 빌드 실패!"
    exit 1
fi 