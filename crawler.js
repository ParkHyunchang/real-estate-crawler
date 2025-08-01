const puppeteer = require('puppeteer');
const axios = require('axios');

async function getNaverAptComplexCode(keyword) {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    window.chrome = {
      runtime: {},
    };
    
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1'
  });

  try {
    console.log('네이버 부동산 메인 페이지로 이동...');
    await page.goto('https://new.land.naver.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('검색창 찾기 중...');
    
    const searchSelectors = [
      'input[placeholder*="단지명"]',
      'input[placeholder*="지역"]',
      'input[type="text"]',
      '.search_input',
      '.search-input',
      '[data-testid="search-input"]',
      'input[name="query"]',
      'input[name="search"]'
    ];

    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        searchInput = await page.$(selector);
        if (searchInput) {
          console.log(`검색창 발견: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`검색창 셀렉터 실패: ${selector}`);
      }
    }

    if (!searchInput) {
      console.log('검색창을 찾지 못함. 직접 검색 URL로 이동...');
      const searchUrl = `https://new.land.naver.com/search?query=${encodeURIComponent(keyword)}`;
      console.log(`검색 URL: ${searchUrl}`);
      
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
    } else {
      await searchInput.click();
      await page.keyboard.type(keyword);
      await page.keyboard.press('Enter');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('스크린샷 저장됨: debug_screenshot.png');

    const pageContent = await page.content();
    console.log('페이지 내용 일부:', pageContent.substring(0, 2000));

    const selectors = [
      '.complex_item',
      '.complex-item',
      '.complex_list_item',
      '.complex-list-item',
      'a[href*="/complexes/"]',
      'a[href*="complexes"]',
      '[data-testid*="complex"]',
      '[data-testid*="item"]',
      '.item_link',
      '.item-link',
      '.list_item',
      '.list-item',
      '.complex_list a',
      '.complex-list a',
      'li a',
      'a'
    ];

    let complexInfo = null;
    
    complexInfo = await page.evaluate((searchKeyword) => {
      console.log('페이지에서 complex 정보 검색 중...');
      
      const allLinks = document.querySelectorAll('a');
      console.log(`총 ${allLinks.length}개의 링크 발견`);
      
      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (href && href.includes('/complexes/')) {
          const match = href.match(/\/complexes\/(\d+)/);
          if (match) {
            const complexNo = match[1];
            const linkText = link.textContent.trim();
            console.log(`Complex 발견: ${linkText} (${complexNo})`);
            
            return {
              name: linkText || searchKeyword,
              complexNo: complexNo
            };
          }
        }
      }
      
      const testElements = document.querySelectorAll('[data-testid]');
      console.log(`data-testid 요소 ${testElements.length}개 발견`);
      
      for (const element of testElements) {
        const testId = element.getAttribute('data-testid');
        console.log(`data-testid: ${testId}`);
        
        if (testId && testId.includes('complex')) {
          const href = element.getAttribute('href') || element.querySelector('a')?.getAttribute('href');
          if (href && href.includes('/complexes/')) {
            const match = href.match(/\/complexes\/(\d+)/);
            if (match) {
              return {
                name: element.textContent.trim() || searchKeyword,
                complexNo: match[1]
              };
            }
          }
        }
      }
      
      return null;
    }, keyword);

    if (!complexInfo) {
      console.log('셀렉터 기반 검색 시도...');
      
      for (const selector of selectors) {
        try {
          console.log(`셀렉터 시도: ${selector}`);
          
          const elements = await page.$$(selector);
          console.log(`${selector}로 ${elements.length}개 요소 발견`);
          
          if (elements.length > 0) {
            await elements[0].click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const currentUrl = page.url();
            console.log(`현재 URL: ${currentUrl}`);
            
            const complexMatch = currentUrl.match(/\/complexes\/(\d+)/);
            if (complexMatch) {
              const complexNo = complexMatch[1];
              
              const nameSelectors = [
                '.complex_title',
                '.complex_name',
                'h1',
                '.title',
                '[data-testid="complex-name"]',
                '.complex-name'
              ];
              
              let complexName = keyword;
              
              for (const nameSelector of nameSelectors) {
                try {
                  const nameElement = await page.$(nameSelector);
                  if (nameElement) {
                    complexName = await page.evaluate(el => el.textContent.trim(), nameElement);
                    break;
                  }
                } catch (e) {
                  console.log(`단지명 셀렉터 실패: ${nameSelector}`);
                }
              }
              
              complexInfo = {
                name: complexName,
                complexNo: complexNo
              };
              break;
            }
          }
        } catch (e) {
          console.log(`셀렉터 실패: ${selector} - ${e.message}`);
          continue;
        }
      }
    }

    if (!complexInfo) {
      console.log('텍스트 기반 검색 시도...');
      
      complexInfo = await page.evaluate((searchKeyword) => {
        const pageText = document.body.innerText;
        console.log('페이지 텍스트:', pageText.substring(0, 1000));
        
        const urlMatches = pageText.match(/\/complexes\/(\d+)/g);
        if (urlMatches && urlMatches.length > 0) {
          const complexNo = urlMatches[0].match(/\d+/)[0];
          return {
            name: searchKeyword,
            complexNo: complexNo
          };
        }
        
        return null;
      }, keyword);
    }

    await browser.close();
    
    if (!complexInfo) {
      throw new Error(`단지 "${keyword}"를 찾을 수 없습니다. 네이버 부동산 사이트 구조가 변경되었을 수 있습니다.`);
    }
    
    return complexInfo;
    
  } catch (error) {
    console.error('크롤링 오류:', error.message);
    await browser.close();
    throw new Error(`단지 검색 실패: ${error.message}`);
  }
}

async function getComplexPropertyInfo(complexNo) {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    window.chrome = {
      runtime: {},
    };
    
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  try {
    console.log('네이버 부동산 메인 페이지로 이동하여 세션 생성...');
    await page.goto('https://new.land.naver.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const complexUrl = `https://new.land.naver.com/complexes/${complexNo}`;
    console.log(`단지 상세 페이지로 이동: ${complexUrl}`);
    
    await page.goto(complexUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 네이버 부동산 API 호출 시도
    console.log('네이버 부동산 API 호출 시도...');
    let apiData = null;
    
    try {
      // 네트워크 요청을 가로채서 API 응답 확인
      const response = await page.evaluate(async (complexNo) => {
        try {
          // 네이버 부동산 API 엔드포인트들
          const apiEndpoints = [
            `https://new.land.naver.com/api/complexes/${complexNo}`,
            `https://new.land.naver.com/api/complexes/${complexNo}/overview`,
            `https://new.land.naver.com/api/complexes/${complexNo}/info`,
            `https://new.land.naver.com/api/complexes/${complexNo}/detail`
          ];
          
          for (const endpoint of apiEndpoints) {
            try {
              console.log(`API 엔드포인트 시도: ${endpoint}`);
              const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log(`API 응답 성공: ${endpoint}`, data);
                return data;
              }
            } catch (error) {
              console.log(`API 호출 실패: ${endpoint}`, error.message);
            }
          }
          
          return null;
        } catch (error) {
          console.log('API 호출 중 오류:', error.message);
          return null;
        }
      }, complexNo);
      
      if (response) {
        apiData = response;
        console.log('API 데이터 획득:', apiData);
      }
    } catch (error) {
      console.log('API 호출 실패:', error.message);
    }

    console.log('웹페이지에서 데이터 스크래핑 중...');
    
    const scrapedData = await page.evaluate((apiData) => {
      const data = {
        complexInfo: {},
        properties: []
      };

      // API 데이터가 있으면 우선 사용
      if (apiData) {
        console.log('API 데이터 사용:', apiData);
        if (apiData.complexName || apiData.name) {
          data.complexInfo.name = apiData.complexName || apiData.name;
        }
        if (apiData.address || apiData.location) {
          data.complexInfo.address = apiData.address || apiData.location;
        }
        if (apiData.totalHouseholds || apiData.households) {
          data.complexInfo.totalHouseholds = apiData.totalHouseholds || apiData.households;
        }
        if (apiData.totalBuildings || apiData.buildings) {
          data.complexInfo.totalBuildings = apiData.totalBuildings || apiData.buildings;
        }
        if (apiData.constructionDate || apiData.completionDate) {
          data.complexInfo.constructionDate = apiData.constructionDate || apiData.completionDate;
        }
      }

      // 단지명 스크래핑 - 더 정확한 셀렉터로 개선
      const complexNameSelectors = [
        // 실제 네이버 부동산에서 사용하는 셀렉터들
        'h1.complex_title',
        'h1.complex_name', 
        'h1.title',
        '.complex_title h1',
        '.complex_name h1',
        '.title h1',
        'h1',
        '[data-testid="complex-name"]',
        '.complex-name',
        '.complex_title',
        '.complex_name',
        '.title',
        // 더 구체적인 셀렉터들
        '[class*="complex"][class*="name"]',
        '[class*="complex"][class*="title"]',
        '[class*="name"][class*="complex"]',
        '[class*="title"][class*="complex"]',
        'main h1',
        'main .title',
        'main .name',
        'header h1',
        'header .title',
        'header .name',
        // 실제 네이버 부동산에서 사용하는 클래스들
        '.complex_info h1',
        '.complex_info .title',
        '.complex_info .name',
        '.detail_info h1',
        '.detail_info .title',
        '.detail_info .name',
        // 실제 네이버 부동산에서 사용하는 더 구체적인 셀렉터들
        '[class*="complex"][class*="info"] h1',
        '[class*="complex"][class*="info"] .title',
        '[class*="complex"][class*="info"] .name',
        '[class*="detail"][class*="info"] h1',
        '[class*="detail"][class*="info"] .title',
        '[class*="detail"][class*="info"] .name',
        // 실제 네이버 부동산에서 사용하는 클래스들
        '.complex_info h1',
        '.complex_info .title',
        '.complex_info .name',
        '.detail_info h1',
        '.detail_info .title',
        '.detail_info .name',
        // 네이버 부동산 특화 셀렉터들
        '[class*="complex"][class*="header"] h1',
        '[class*="complex"][class*="header"] .title',
        '[class*="complex"][class*="header"] .name',
        '[class*="detail"][class*="header"] h1',
        '[class*="detail"][class*="header"] .title',
        '[class*="detail"][class*="header"] .name',
        // 페이지 제목에서 추출
        'title',
        // 메인 콘텐츠 영역
        'main [class*="title"]',
        'main [class*="name"]',
        'main h1',
        'main h2',
        // 헤더 영역
        'header [class*="title"]',
        'header [class*="name"]',
        'header h1',
        'header h2'
      ];

      // 단지명 필터링 함수 - 더 엄격한 필터링으로 개선
      function isValidComplexName(text) {
        if (!text || text.length < 2) return false;
        
        // 제외할 패턴들 (더 엄격하게)
        const excludePatterns = [
          '관심단지', '추가되었습니다', '삭제되었습니다', '더보기',
          '네이버페이', '부동산', '알림', '전체', '읽은', '삭제',
          '모두', '확인', '취소', '레이어', '닫기', '거래방식',
          '묶기', '동일매물', '전체보기', '전체 알림', '읽은 알림',
          '삭제모두', '삭제알림을', '모두 삭제하시겠습니까',
          '본문', '바로가기', '바로가', '계를', '필터', '메를', '목록', '지도',
          '사진', '스타트보드', '스포츠', '시리즈', '오피스', '웹소설',
          '주소록', '증간', '금융', '지식', '백과', '책', '뉴스',
          '메일', '카페', '블로그', '쇼핑', 'TV', '웹툰',
          '사전', '번역', '지식iN', '스마트보드', '권', '금융',
          '유형', '아파트', '세대수', '동수', '총', '사용승인일', '면적',
          'm²', '㎡', '~', '동', '세대', '억', '만', '원',
          '시세', '실거래가', '네이버'
        ];
        
        for (const pattern of excludePatterns) {
          if (text.includes(pattern)) return false;
        }
        
        // 의미 있는 단지명 패턴 확인 (더 엄격하게)
        const validPatterns = [
          /^[가-힣]+[자이|타워|빌라|아파트|단지|리버|파크|힐스|가든|스퀘어|센터|플라자|타운|빌|맨션|리센츠]$/,
          /^[가-힣]+\d+[차|동|호]$/,
          /^[가-힣]+[시|구|동]$/,
          /^[가-힣]+\([가-힣]+\)$/,  // 예: 한화포레나킨텍스(주상복합)
          /^[가-힣]+\d+[차|동|호]\([가-힣]+\)$/,  // 예: 우성1차(아파트)
          /^[가-힣]+[포레나|킨텍스|리버|파크|힐스|가든|스퀘어|센터|플라자|타운|빌|맨션|리센츠]/  // 예: 한화포레나킨텍스
        ];
        
        for (const pattern of validPatterns) {
          if (pattern.test(text)) return true;
        }
        
        // 길이가 3-20자이고 특수문자가 적절한 경우만
        if (text.length >= 3 && text.length <= 20) {
          const specialCharCount = (text.match(/[^\w\s가-힣]/g) || []).length;
          if (specialCharCount <= 2) return true;  // 괄호나 기타 특수문자 허용
        }
        
        return false;
      }

      // 단지명 정리 함수 추가
      function cleanComplexName(text) {
        if (!text) return null;
        
        // 불필요한 텍스트 제거
        const cleanText = text
          .replace(/관심단지에 추가되었습니다\.?/g, '')
          .replace(/관심단지가 삭제되었습니다\.?/g, '')
          .replace(/단지정보 더보기/g, '')
          .replace(/지장보 더보기/g, '')
          .replace(/바로가기/g, '')
          .replace(/바로가/g, '')
          .replace(/\s+/g, ' ')  // 여러 공백을 하나로
          .trim();
        
        return cleanText;
      }

      // API에서 단지명을 가져오지 못한 경우에만 스크래핑
      if (!data.complexInfo.name) {
        // 먼저 페이지에서 실제 단지명을 찾기
        let foundComplexName = null;
        
        for (const selector of complexNameSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent.trim();
            console.log(`셀렉터 ${selector}에서 발견된 텍스트:`, text);
            if (isValidComplexName(text)) {
              foundComplexName = text;
              console.log('유효한 단지명 발견:', text);
              break;
            }
          }
        }

        // 만약 셀렉터로 찾지 못했다면, 페이지 전체에서 단지명 패턴 찾기
        if (!foundComplexName) {
          console.log('셀렉터로 단지명을 찾지 못함. 페이지 전체에서 검색...');
          const pageText = document.body.innerText;
          
          // 실제 단지명 패턴 찾기
          const complexNamePatterns = [
            /([가-힣]+\d+[차])/,  // 예: 우성1차
            /([가-힣]+[자이|타워|빌라|아파트|단지|리버|파크|힐스|가든|스퀘어|센터|플라자|타운|빌|맨션|리센츠])/,  // 예: 반포자이
            /([가-힣]+\d+[동])/,  // 예: 신대방1동
            /([가-힣]+[포레나|킨텍스|리버|파크|힐스|가든|스퀘어|센터|플라자|타운|빌|맨션|리센츠])/,  // 예: 한화포레나킨텍스
            /([가-힣]+\([가-힣]+\))/,  // 예: 한화포레나킨텍스(주상복합)
          ];
          
          for (const pattern of complexNamePatterns) {
            const matches = pageText.match(pattern);
            if (matches && matches[1]) {
              const candidate = matches[1];
              console.log(`패턴 ${pattern}에서 발견된 후보:`, candidate);
              if (isValidComplexName(candidate)) {
                foundComplexName = candidate;
                console.log('패턴 매칭으로 단지명 발견:', candidate);
                break;
              }
            }
          }
        }

        // 페이지 제목에서도 단지명 찾기
        if (!foundComplexName) {
          const pageTitle = document.title;
          console.log('페이지 제목에서 단지명 검색:', pageTitle);
          
          // 페이지 제목에서 단지명 패턴 찾기
          const titlePatterns = [
            /([가-힣]+[포레나|킨텍스|리버|파크|힐스|가든|스퀘어|센터|플라자|타운|빌|맨션|리센츠])/,
            /([가-힣]+\d+[차])/,
            /([가-힣]+\([가-힣]+\))/,
          ];
          
          for (const pattern of titlePatterns) {
            const matches = pageTitle.match(pattern);
            if (matches && matches[1]) {
              const candidate = matches[1];
              console.log(`제목 패턴 ${pattern}에서 발견된 후보:`, candidate);
              if (isValidComplexName(candidate)) {
                foundComplexName = candidate;
                console.log('페이지 제목에서 단지명 발견:', candidate);
                break;
              }
            }
          }
        }

        if (foundComplexName) {
          data.complexInfo.name = cleanComplexName(foundComplexName);
        }
      }

      // 페이지 전체 텍스트에서 정보 추출 - 더 정확한 패턴으로 개선
      const pageText = document.body.innerText;
      
      // 세대수 정보 추출 - 더 정확한 패턴
      const householdMatch = pageText.match(/총\s*(\d+)\s*세대/);
      if (householdMatch && !data.complexInfo.totalHouseholds) {
        data.complexInfo.totalHouseholds = householdMatch[1];
      }

      // 건물 수 정보 추출 - 더 정확한 패턴
      const buildingMatch = pageText.match(/총\s*(\d+)\s*동/);
      if (buildingMatch && !data.complexInfo.totalBuildings) {
        data.complexInfo.totalBuildings = buildingMatch[1];
      }

      // 건축년도 정보 추출 - 더 정확한 패턴
      const yearMatch = pageText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (yearMatch && !data.complexInfo.constructionDate) {
        data.complexInfo.constructionDate = `${yearMatch[1]}-${yearMatch[2]}-${yearMatch[3]}`;
      }

      // 면적 정보 추출 - 더 정확한 패턴
      const areaMatch = pageText.match(/(\d+\.?\d*)\s*m²/);
      if (areaMatch) {
        data.complexInfo.area = areaMatch[1];
      }

      // 주소 정보 스크래핑 - 포함하는 방식으로 변경
      function isValidAddress(text) {
        if (!text || text.length < 5) return false;
        
        // 포함해야 할 주소 패턴들
        const includePatterns = [
          '서울', '경기도', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
          '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주도',
          '동작구', '강남구', '서초구', '마포구', '용산구', '중구', '종로구', '성동구', '광진구',
          '영등포구', '구로구', '금천구', '양천구', '강서구', '강북구', '도봉구', '노원구', '중랑구',
          '성북구', '강동구', '송파구', '광명시', '부천시', '고양시', '의정부시', '동두천시', '안산시',
          '과천시', '오산시', '시흥시', '군포시', '의왕시', '하남시', '용인시', '파주시', '이천시',
          '안성시', '김포시', '화성시', '광주시', '여주시', '양평군', '고양군', '과천군', '광명군',
          '시흥군', '부천군', '김포군', '강화군', '옹진군', '연천군', '가평군', '포천군', '양주군',
          '동두천군', '여주군', '안성군', '평택군', '수원군', '오산군', '화성군', '시흥군', '군포군',
          '의왕군', '하남군', '용인군', '이천군', '광주군', '여주군', '양평군', '안산군', '과천군',
          '신대방동', '신림동', '봉천동', '서초동', '반포동', '잠원동', '신사동', '압구정동', '청담동',
          '삼성동', '역삼동', '논현동', '신논현동', '개포동', '수서동', '일원동', '세곡동', '자곡동',
          '율현동', '구로동', '가리봉동', '고척동', '개봉동', '오류동', '천왕동', '신도림동', '대림동',
          '가산동', '독산동', '시흥동', '신월동', '등촌동', '화곡동', '강서동', '우장산동', '공항동',
          '과해동', '오곡동', '오쇠동', '신정동', '목동', '염창동', '등촌동', '마포동', '공덕동',
          '아현동', '도화동', '용강동', '대흥동', '염리동', '신수동', '서대문동', '충정로', '합동',
          '미근동', '냉천동', '천연동', '옥천동', '영천동', '현저동', '북아현동', '홍제동', '대현동',
          '대신동', '신촌동', '봉원동', '창천동', '연희동', '홍대동', '상수동', '하중동', '신정동',
          '당인동', '서교동', '동교동', '합정동', '망원동', '연남동', '상암동', '성산동', '중동',
          '상암동', '성산동', '중동', '상암동', '성산동', '중동', '상암동', '성산동', '중동'
        ];
        
        // 포함 패턴이 하나라도 있으면 true
        for (const pattern of includePatterns) {
          if (text.includes(pattern)) {
            console.log(`주소 포함 패턴 발견: ${pattern} in "${text}"`);
            return true;
          }
        }
        
        return false;
      }

      const addressSelectors = [
        '[class*="address"]',
        '[class*="location"]', 
        '[class*="addr"]',
        '[data-testid="address"]',
        '.address',
        '.location',
        '.addr',
        'span[class*="address"]',
        'div[class*="address"]',
        'p[class*="address"]',
        '[class*="complex"][class*="address"]',
        '[class*="complex"][class*="location"]',
        '[class*="info"][class*="address"]',
        '[class*="detail"][class*="address"]',
        'main [class*="address"]',
        'main [class*="location"]',
        'header [class*="address"]',
        'header [class*="location"]',
        '[class*="주소"]',
        '[class*="위치"]',
        '[class*="지역"]'
      ];

      // API에서 주소를 가져오지 못한 경우에만 스크래핑
      if (!data.complexInfo.address) {
        // 먼저 셀렉터로 주소 찾기
        let foundAddress = null;
        
        for (const selector of addressSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent.trim();
            console.log(`주소 셀렉터 ${selector}에서 발견된 텍스트:`, text);
            if (isValidAddress(text)) {
              foundAddress = text;
              console.log('유효한 주소 발견:', text);
              break;
            }
          }
          if (foundAddress) break;
        }

        // 만약 셀렉터로 찾지 못했다면, 페이지 전체에서 주소 패턴 찾기
        if (!foundAddress) {
          console.log('셀렉터로 주소를 찾지 못함. 페이지 전체에서 검색...');
          const pageText = document.body.innerText;
          
          // 실제 주소 패턴 찾기 (포함하는 방식)
          const addressPatterns = [
            /([가-힣]+시\s*[가-힣]+구\s*[가-힣]+동)/,  // 예: 서울특별시 동작구 신대방동
            /([가-힣]+시\s*[가-힣]+구)/,  // 예: 서울특별시 동작구
            /([가-힣]+구\s*[가-힣]+동)/,  // 예: 동작구 신대방동
            /([가-힣]+동\s*\d+)/,  // 예: 신대방동 467
            /([가-힣]+시)/,  // 예: 서울시
            /([가-힣]+구)/,  // 예: 동작구
            /([가-힣]+동)/,  // 예: 신대방동
          ];
          
          for (const pattern of addressPatterns) {
            const matches = pageText.match(pattern);
            if (matches && matches[1]) {
              const candidate = matches[1];
              console.log(`주소 패턴 ${pattern}에서 발견된 후보:`, candidate);
              if (isValidAddress(candidate)) {
                foundAddress = candidate;
                console.log('패턴 매칭으로 주소 발견:', candidate);
                break;
              }
            }
          }
        }

        if (foundAddress) {
          data.complexInfo.address = foundAddress;
        }
      }

      // 가격 정보 스크래핑
      const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
      priceElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('억') || text.includes('만')) {
          data.complexInfo.prices = data.complexInfo.prices || [];
          data.complexInfo.prices.push(text);
        }
      });

      console.log('스크래핑된 데이터:', data);
      console.log('페이지 제목:', document.title);
      console.log('URL:', window.location.href);

      // 페이지에서 모든 텍스트 요소 검사하여 주소 찾기
      if (!data.complexInfo.address) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (isValidAddress(text)) {
            data.complexInfo.address = text;
            console.log('전체 스캔으로 주소 발견:', text);
            break;
          }
        }
      }

      // 단지명이 없으면 전체 스캔으로 찾기
      if (!data.complexInfo.name) {
        const allElementsForName = document.querySelectorAll('*');
        for (const el of allElementsForName) {
          const text = el.textContent.trim();
          if (isValidComplexName(text)) {
            data.complexInfo.name = text;
            console.log('전체 스캔으로 단지명 발견:', text);
            break;
          }
        }
      }

      // 단지 상세 정보 스크래핑
      const detailSelectors = [
        '.complex_info',
        '.complex-info',
        '.detail_info',
        '.detail-info',
        '[class*="info"]',
        '[class*="detail"]'
      ];

      detailSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim();
          
          // 세대수 패턴
          const householdPattern = /(\d+)\s*세대/;
          const householdMatch = text.match(householdPattern);
          if (householdMatch && !data.complexInfo.totalHouseholds) {
            data.complexInfo.totalHouseholds = householdMatch[1];
          }

          // 건물수 패턴
          const buildingPattern = /(\d+)\s*동/;
          const buildingMatch = text.match(buildingPattern);
          if (buildingMatch && !data.complexInfo.totalBuildings) {
            data.complexInfo.totalBuildings = buildingMatch[1];
          }

          // 건축년도 패턴
          const yearPattern = /(\d{4})\.(\d{2})\.(\d{2})/;
          const yearMatch = text.match(yearPattern);
          if (yearMatch && !data.complexInfo.constructionDate) {
            data.complexInfo.constructionDate = `${yearMatch[1]}-${yearMatch[2]}-${yearMatch[3]}`;
          }

          // 면적 패턴
          const areaPattern = /(\d+\.?\d*)\s*m²/;
          const areaMatch = text.match(areaPattern);
          if (areaMatch && !data.complexInfo.area) {
            data.complexInfo.area = areaMatch[1];
          }

          // 주소 패턴 - 이미 찾은 주소가 있으면 덮어쓰지 않음
          if ((text.includes('시') || text.includes('구') || text.includes('동')) && !data.complexInfo.address) {
            if (isValidAddress(text)) {
              data.complexInfo.address = text;
              console.log('상세 정보에서 주소 발견:', text);
            }
          }
        });
      });

      // 매물 정보 스크래핑 - 실제 네이버 부동산 구조에 맞게 수정
      const propertyElements = document.querySelectorAll('[class*="item"], [class*="property"], [class*="listing"], [class*="article"]');
      console.log(`총 ${propertyElements.length}개의 매물 요소 발견`);
      
      propertyElements.forEach((el, index) => {
        const property = {
          title: '',
          price: '',
          details: '',
          area: '',
          floor: '',
          direction: '',
          type: ''
        };

        // 전체 텍스트 가져오기
        const fullText = el.textContent.trim();
        console.log(`매물 ${index + 1} 전체 텍스트:`, fullText);

        // 제목 찾기
        const titleEl = el.querySelector('h3, h4, .title, .name, [class*="title"], [class*="name"]');
        if (titleEl) {
          property.title = titleEl.textContent.trim();
        }

        // 가격 찾기
        const priceEl = el.querySelector('[class*="price"], [class*="Price"], [class*="cost"], [class*="amount"]');
        if (priceEl) {
          property.price = priceEl.textContent.trim();
        }

        // 상세 정보 찾기
        const detailEl = el.querySelector('[class*="detail"], [class*="info"], [class*="desc"]');
        if (detailEl) {
          property.details = detailEl.textContent.trim();
        }

        // 면적 정보 추출
        const areaMatch = fullText.match(/(\d+\.?\d*)\s*m²/);
        if (areaMatch) {
          property.area = areaMatch[1];
        }

        // 층수 정보 추출
        const floorMatch = fullText.match(/(\d+)\s*층/);
        if (floorMatch) {
          property.floor = floorMatch[1];
        }

        // 방향 정보 추출
        const directionMatch = fullText.match(/(남향|북향|동향|서향|남동향|남서향|북동향|북서향)/);
        if (directionMatch) {
          property.direction = directionMatch[1];
        }

        // 매물 타입 추출 - 더 정확한 방법
        let typeFound = false;
        
        // 1. 전체 텍스트에서 타입 찾기
        const fullTypeMatch = fullText.match(/(매매|전세|월세|분양)/);
        if (fullTypeMatch) {
          property.type = fullTypeMatch[1];
          typeFound = true;
          console.log(`매물 ${index + 1} 타입 발견 (전체 텍스트):`, property.type);
        }

        // 2. 가격에서 타입 찾기
        if (!typeFound && property.price) {
          const priceTypeMatch = property.price.match(/(매매|전세|월세|분양)/);
          if (priceTypeMatch) {
            property.type = priceTypeMatch[1];
            typeFound = true;
            console.log(`매물 ${index + 1} 타입 발견 (가격):`, property.type);
          }
        }

        // 3. 제목에서 타입 찾기
        if (!typeFound && property.title) {
          const titleTypeMatch = property.title.match(/(매매|전세|월세|분양)/);
          if (titleTypeMatch) {
            property.type = titleTypeMatch[1];
            typeFound = true;
            console.log(`매물 ${index + 1} 타입 발견 (제목):`, property.type);
          }
        }

        // 4. 상세정보에서 타입 찾기
        if (!typeFound && property.details) {
          const detailTypeMatch = property.details.match(/(매매|전세|월세|분양)/);
          if (detailTypeMatch) {
            property.type = detailTypeMatch[1];
            typeFound = true;
            console.log(`매물 ${index + 1} 타입 발견 (상세정보):`, property.type);
          }
        }

        // 5. 가격 패턴으로 타입 추정
        if (!typeFound && property.price) {
          const priceText = property.price.toLowerCase();
          console.log(`매물 ${index + 1} 가격 패턴 분석:`, priceText);
          
          if (priceText.includes('전세')) {
            property.type = '전세';
            typeFound = true;
            console.log(`매물 ${index + 1} 전세로 분류`);
          }
          else if (priceText.includes('월세') || priceText.includes('/')) {
            property.type = '월세';
            typeFound = true;
            console.log(`매물 ${index + 1} 월세로 분류`);
          }
          else if (priceText.includes('매매') || (priceText.includes('억') && !priceText.includes('월세'))) {
            property.type = '매매';
            typeFound = true;
            console.log(`매물 ${index + 1} 매매로 분류`);
          }
          else if (priceText.includes('분양')) {
            property.type = '분양';
            typeFound = true;
            console.log(`매물 ${index + 1} 분양으로 분류`);
          }
        }

        // 타입이 찾아지지 않은 경우 기본값 설정
        if (!typeFound) {
          property.type = '기타';
          console.log(`매물 ${index + 1} 타입을 찾을 수 없음, 기본값 설정`);
        }

        // 최종 매물 정보 로그
        console.log(`매물 ${index + 1} 최종 정보:`, {
          title: property.title,
          price: property.price,
          type: property.type,
          details: property.details
        });

        if (property.title || property.price) {
          data.properties.push(property);
        }
      });

      // 추가 단지 정보 패턴 찾기
      const complexPatterns = [
        { pattern: /총\s*(\d+)세대/, key: 'totalHouseholds' },
        { pattern: /(\d+)동/, key: 'totalBuildings' },
        { pattern: /(\d{4}\.\d{2}\.\d{2})/, key: 'constructionDate' },
        { pattern: /(\d+\.\d+)m²/, key: 'area' },
        { pattern: /(\d+)층/, key: 'totalFloors' },
        { pattern: /(\d+)개/, key: 'totalUnits' }
      ];

      complexPatterns.forEach(({ pattern, key }) => {
        const match = pageText.match(pattern);
        if (match && !data.complexInfo[key]) {
          data.complexInfo[key] = match[1];
        }
      });

      // 특별한 정보 추출 - 더 정확한 패턴으로 개선
      const specialInfo = {
        parking: /주차\s*(\d+)대/,
        elevator: /엘리베이터\s*(\d+)대/,
        heating: /난방\s*([가-힣]+)/,
        structure: /구조\s*([가-힣]+)/,
        developer: /시행사\s*([가-힣]+)/,
        constructor: /시공사\s*([가-힣]+)/
      };

      Object.entries(specialInfo).forEach(([key, pattern]) => {
        const match = pageText.match(pattern);
        if (match) {
          data.complexInfo[key] = match[1];
        }
      });

      // 페이지 전체에서 추가 정보 검색 - 더 정확한 패턴으로 개선
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent.trim();
        
        // 주차 정보 - 더 다양한 패턴
        if (text.includes('주차') && !data.complexInfo.parking) {
          const parkingMatch = text.match(/(\d+)대/);
          if (parkingMatch) {
            data.complexInfo.parking = parkingMatch[1];
            console.log('주차 정보 발견:', parkingMatch[1]);
          }
        }
        
        // 엘리베이터 정보 - 더 다양한 패턴
        if (text.includes('엘리베이터') && !data.complexInfo.elevator) {
          const elevatorMatch = text.match(/(\d+)대/);
          if (elevatorMatch) {
            data.complexInfo.elevator = elevatorMatch[1];
            console.log('엘리베이터 정보 발견:', elevatorMatch[1]);
          }
        }
        
        // 난방 정보 - 더 다양한 패턴
        if (text.includes('난방') && !data.complexInfo.heating) {
          const heatingMatch = text.match(/난방\s*([가-힣]+)/);
          if (heatingMatch) {
            data.complexInfo.heating = heatingMatch[1];
            console.log('난방 정보 발견:', heatingMatch[1]);
          }
        }
        
        // 구조 정보 - 더 다양한 패턴
        if (text.includes('구조') && !data.complexInfo.structure) {
          const structureMatch = text.match(/구조\s*([가-힣]+)/);
          if (structureMatch) {
            data.complexInfo.structure = structureMatch[1];
            console.log('구조 정보 발견:', structureMatch[1]);
          }
        }
        
        // 시행사 정보 - 더 다양한 패턴
        if (text.includes('시행사') && !data.complexInfo.developer) {
          const developerMatch = text.match(/시행사\s*([가-힣]+)/);
          if (developerMatch) {
            data.complexInfo.developer = developerMatch[1];
            console.log('시행사 정보 발견:', developerMatch[1]);
          }
        }
        
        // 시공사 정보 - 더 다양한 패턴
        if (text.includes('시공사') && !data.complexInfo.constructor) {
          const constructorMatch = text.match(/시공사\s*([가-힣]+)/);
          if (constructorMatch) {
            data.complexInfo.constructor = constructorMatch[1];
            console.log('시공사 정보 발견:', constructorMatch[1]);
          }
        }
      }

      // 추가 정보 추출 - 더 정확한 패턴으로 개선
      const additionalPatterns = [
        { pattern: /주차\s*(\d+)대/, key: 'parking' },
        { pattern: /엘리베이터\s*(\d+)대/, key: 'elevator' },
        { pattern: /난방\s*([가-힣]+)/, key: 'heating' },
        { pattern: /구조\s*([가-힣]+)/, key: 'structure' },
        { pattern: /시행사\s*([가-힣]+)/, key: 'developer' },
        { pattern: /시공사\s*([가-힣]+)/, key: 'constructor' },
        { pattern: /총\s*(\d+)세대/, key: 'totalHouseholds' },
        { pattern: /(\d+)동/, key: 'totalBuildings' },
        { pattern: /(\d{4}\.\d{2}\.\d{2})/, key: 'constructionDate' },
        { pattern: /(\d+\.\d+)m²/, key: 'area' },
        { pattern: /(\d+)층/, key: 'totalFloors' },
        { pattern: /(\d+)개/, key: 'totalUnits' }
      ];

      additionalPatterns.forEach(({ pattern, key }) => {
        const match = pageText.match(pattern);
        if (match && !data.complexInfo[key]) {
          data.complexInfo[key] = match[1];
          console.log(`${key} 정보 발견:`, match[1]);
        }
      });

      // 네이버 부동산 특화 정보 추출
      const naverSpecificSelectors = [
        // 주차 정보
        { selector: '.info_table td:contains("주차")', key: 'parking' },
        { selector: '[data-testid="parking"]', key: 'parking' },
        { selector: '.complex_info td:contains("주차")', key: 'parking' },
        { selector: '.detail_info td:contains("주차")', key: 'parking' },
        
        // 엘리베이터 정보
        { selector: '.info_table td:contains("엘리베이터")', key: 'elevator' },
        { selector: '[data-testid="elevator"]', key: 'elevator' },
        { selector: '.complex_info td:contains("엘리베이터")', key: 'elevator' },
        { selector: '.detail_info td:contains("엘리베이터")', key: 'elevator' },
        
        // 난방 정보
        { selector: '.info_table td:contains("난방")', key: 'heating' },
        { selector: '[data-testid="heating"]', key: 'heating' },
        { selector: '.complex_info td:contains("난방")', key: 'heating' },
        { selector: '.detail_info td:contains("난방")', key: 'heating' },
        
        // 구조 정보
        { selector: '.info_table td:contains("구조")', key: 'structure' },
        { selector: '[data-testid="structure"]', key: 'structure' },
        { selector: '.complex_info td:contains("구조")', key: 'structure' },
        { selector: '.detail_info td:contains("구조")', key: 'structure' },
        
        // 시행사 정보
        { selector: '.info_table td:contains("시행사")', key: 'developer' },
        { selector: '[data-testid="developer"]', key: 'developer' },
        { selector: '.complex_info td:contains("시행사")', key: 'developer' },
        { selector: '.detail_info td:contains("시행사")', key: 'developer' },
        
        // 시공사 정보
        { selector: '.info_table td:contains("시공사")', key: 'constructor' },
        { selector: '[data-testid="constructor"]', key: 'constructor' },
        { selector: '.complex_info td:contains("시공사")', key: 'constructor' },
        { selector: '.detail_info td:contains("시공사")', key: 'constructor' }
      ];

      // 네이버 부동산 특화 셀렉터로 정보 추출
      naverSpecificSelectors.forEach(({ selector, key }) => {
        try {
          const elements = document.querySelectorAll(selector.replace(':contains', ''));
          elements.forEach(el => {
            const text = el.textContent.trim();
            if (text && !data.complexInfo[key]) {
              // 실제 값 추출 (라벨 제외)
              const valueMatch = text.match(/[가-힣]+:\s*([가-힣0-9]+)/);
              if (valueMatch) {
                data.complexInfo[key] = valueMatch[1];
                console.log(`${key} 네이버 특화 셀렉터에서 발견:`, valueMatch[1]);
              }
            }
          });
        } catch (error) {
          console.log(`${key} 셀렉터 오류:`, error.message);
        }
      });

      // 테이블 형태의 정보 추출
      const tableSelectors = [
        '.info_table',
        '.complex_info table',
        '.detail_info table',
        '[class*="info"] table',
        '[class*="detail"] table'
      ];

      tableSelectors.forEach(tableSelector => {
        const tables = document.querySelectorAll(tableSelector);
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();
              
              if (label.includes('주차') && !data.complexInfo.parking) {
                const parkingMatch = value.match(/(\d+)대/);
                if (parkingMatch) {
                  data.complexInfo.parking = parkingMatch[1];
                  console.log('테이블에서 주차 정보 발견:', parkingMatch[1]);
                }
              }
              
              if (label.includes('엘리베이터') && !data.complexInfo.elevator) {
                const elevatorMatch = value.match(/(\d+)대/);
                if (elevatorMatch) {
                  data.complexInfo.elevator = elevatorMatch[1];
                  console.log('테이블에서 엘리베이터 정보 발견:', elevatorMatch[1]);
                }
              }
              
              if (label.includes('난방') && !data.complexInfo.heating) {
                data.complexInfo.heating = value;
                console.log('테이블에서 난방 정보 발견:', value);
              }
              
              if (label.includes('구조') && !data.complexInfo.structure) {
                data.complexInfo.structure = value;
                console.log('테이블에서 구조 정보 발견:', value);
              }
              
              if (label.includes('시행사') && !data.complexInfo.developer) {
                data.complexInfo.developer = value;
                console.log('테이블에서 시행사 정보 발견:', value);
              }
              
              if (label.includes('시공사') && !data.complexInfo.constructor) {
                data.complexInfo.constructor = value;
                console.log('테이블에서 시공사 정보 발견:', value);
              }
            }
          });
        });
      });

      // 최종 데이터 보호 - 객체 처리 개선
      const finalData = {
        complexInfo: {
          name: data.complexInfo.name || null,
          address: data.complexInfo.address || null,
          totalHouseholds: data.complexInfo.totalHouseholds || null,
          totalBuildings: data.complexInfo.totalBuildings || null,
          constructionDate: data.complexInfo.constructionDate || null,
          area: data.complexInfo.area || null,
          prices: data.complexInfo.prices || [],
          parking: typeof data.complexInfo.parking === 'object' ? null : (data.complexInfo.parking || null),
          elevator: typeof data.complexInfo.elevator === 'object' ? null : (data.complexInfo.elevator || null),
          heating: typeof data.complexInfo.heating === 'object' ? null : (data.complexInfo.heating || null),
          structure: typeof data.complexInfo.structure === 'object' ? null : (data.complexInfo.structure || null),
          developer: typeof data.complexInfo.developer === 'object' ? null : (data.complexInfo.developer || null),
          constructor: typeof data.complexInfo.constructor === 'object' ? null : (data.complexInfo.constructor || null)
        },
        properties: data.properties || []
      };

      console.log('최종 데이터:', finalData);
      return finalData;
    }, apiData);

    console.log('스크래핑된 데이터:', scrapedData);

    await browser.close();
    return scrapedData;

  } catch (error) {
    console.error('Error fetching property info:', error.message);
    await browser.close();
    throw new Error(`매물 정보를 가져오는데 실패했습니다: ${error.message}`);
  }
}

async function searchComplexAndGetProperties(keyword) {
  try {
    console.log(`단지 검색 중: ${keyword}`);
    const complexInfo = await getNaverAptComplexCode(keyword);
    
    if (!complexInfo || !complexInfo.complexNo) {
      throw new Error('해당 단지를 찾을 수 없습니다.');
    }

    console.log(`complexInfo: ${JSON.stringify(complexInfo)})`);
    console.log(`단지 정보: ${complexInfo.name} (${complexInfo.complexNo})`);

    console.log('매물 정보 조회 중...');
    const propertyInfo = await getComplexPropertyInfo(complexInfo.complexNo);

    return {
      searchKeyword: keyword,
      complexInfo: complexInfo,
      propertyInfo: propertyInfo
    };
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

module.exports = { 
  getNaverAptComplexCode, 
  getComplexPropertyInfo,
  searchComplexAndGetProperties 
};
