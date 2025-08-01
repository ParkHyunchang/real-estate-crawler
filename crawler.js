const puppeteer = require('puppeteer');
const axios = require('axios');

async function getNaverAptComplexCode(keyword) {
  const browser = await puppeteer.launch({
    headless: true, // false : 디버깅을 위해 헤드리스 모드 비활성화, true : 브라우저 직접 보면서 확인 불가능
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

  // 봇 탐지 우회를 위한 설정
  await page.evaluateOnNewDocument(() => {
    // webdriver 속성 제거
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // chrome 객체 수정
    window.chrome = {
      runtime: {},
    };
    
    // permissions API 모킹
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  // 더 현실적인 User-Agent 설정
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // 추가 헤더 설정
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
    // 먼저 네이버 부동산 메인 페이지로 이동
    console.log('네이버 부동산 메인 페이지로 이동...');
    await page.goto('https://new.land.naver.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 페이지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 검색창 찾기 및 검색어 입력
    console.log('검색창 찾기 중...');
    
    // 여러 가능한 검색창 셀렉터 시도
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
      // 검색창을 찾지 못한 경우, 직접 검색 URL로 이동
      console.log('검색창을 찾지 못함. 직접 검색 URL로 이동...');
      const searchUrl = `https://new.land.naver.com/search?query=${encodeURIComponent(keyword)}`;
      console.log(`검색 URL: ${searchUrl}`);
      
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
    } else {
      // 검색창에 검색어 입력
      await searchInput.click();
      await page.keyboard.type(keyword);
      await page.keyboard.press('Enter');
      
      // 검색 결과 로딩 대기
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 페이지 스크린샷 저장 (디버깅용)
    await page.screenshot({ path: 'debug_screenshot.png' });
    console.log('스크린샷 저장됨: debug_screenshot.png');

    // 페이지 HTML 내용 확인
    const pageContent = await page.content();
    console.log('페이지 내용 일부:', pageContent.substring(0, 2000));

    // 실제 네이버 부동산 구조에 맞는 셀렉터들
    const selectors = [
      // 단지 정보 카드
      '.complex_item',
      '.complex-item',
      '.complex_list_item',
      '.complex-list-item',
      // 링크 패턴
      'a[href*="/complexes/"]',
      'a[href*="complexes"]',
      // data-testid 패턴
      '[data-testid*="complex"]',
      '[data-testid*="item"]',
      // 클래스 패턴
      '.item_link',
      '.item-link',
      '.list_item',
      '.list-item',
      // 더 넓은 범위
      '.complex_list a',
      '.complex-list a',
      'li a',
      'a'
    ];

    let complexInfo = null;
    
    // 먼저 페이지에서 모든 링크를 찾아서 complex 정보가 있는지 확인
    complexInfo = await page.evaluate((searchKeyword) => {
      console.log('페이지에서 complex 정보 검색 중...');
      
      // 모든 링크를 찾아서 complex 정보가 있는지 확인
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
      
      // data-testid 속성을 가진 요소들 확인
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

    // 만약 위의 방법으로 찾지 못했다면, 셀렉터를 하나씩 시도
    if (!complexInfo) {
      console.log('셀렉터 기반 검색 시도...');
      
      for (const selector of selectors) {
        try {
          console.log(`셀렉터 시도: ${selector}`);
          
          // 셀렉터가 존재하는지 확인
          const elements = await page.$$(selector);
          console.log(`${selector}로 ${elements.length}개 요소 발견`);
          
          if (elements.length > 0) {
            // 첫 번째 요소 클릭
            await elements[0].click();
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // URL에서 complexNo 추출
            const currentUrl = page.url();
            console.log(`현재 URL: ${currentUrl}`);
            
            const complexMatch = currentUrl.match(/\/complexes\/(\d+)/);
            if (complexMatch) {
              const complexNo = complexMatch[1];
              
              // 단지명 가져오기
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

    // 여전히 찾지 못했다면, 페이지의 모든 텍스트에서 complex 번호 찾기
    if (!complexInfo) {
      console.log('텍스트 기반 검색 시도...');
      
      complexInfo = await page.evaluate((searchKeyword) => {
        const pageText = document.body.innerText;
        console.log('페이지 텍스트:', pageText.substring(0, 1000));
        
        // URL 패턴 찾기
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
  // 브라우저를 새로 시작하여 세션 유지
  const browser = await puppeteer.launch({
    headless: true, // false : 디버깅을 위해 헤드리스 모드 비활성화, true : 브라우저 직접 보면서 확인 불가능
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

  // 봇 탐지 우회를 위한 설정
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
    // 먼저 네이버 부동산 메인 페이지로 이동하여 세션 생성
    console.log('네이버 부동산 메인 페이지로 이동하여 세션 생성...');
    await page.goto('https://new.land.naver.com/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 단지 상세 페이지로 직접 이동
    const complexUrl = `https://new.land.naver.com/complexes/${complexNo}`;
    console.log(`단지 상세 페이지로 이동: ${complexUrl}`);
    
    await page.goto(complexUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 웹페이지에서 직접 데이터 스크래핑
    console.log('웹페이지에서 데이터 스크래핑 중...');
    
    const scrapedData = await page.evaluate(() => {
      const data = {
        complexInfo: {},
        properties: []
      };

      // 단지 기본 정보 스크래핑
      const complexNameElement = document.querySelector('h1, .complex_title, .complex_name, .title');
      if (complexNameElement) {
        data.complexInfo.name = complexNameElement.textContent.trim();
      }

      // 페이지 전체 텍스트에서 정보 추출
      const pageText = document.body.innerText;
      
      // 세대수 정보 추출
      const householdMatch = pageText.match(/총\s*(\d+)\s*세대/);
      if (householdMatch) {
        data.complexInfo.totalHouseholds = householdMatch[1];
      }

      // 건물 수 정보 추출
      const buildingMatch = pageText.match(/총\s*(\d+)\s*동/);
      if (buildingMatch) {
        data.complexInfo.totalBuildings = buildingMatch[1];
      }

      // 건축년도 정보 추출
      const yearMatch = pageText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (yearMatch) {
        data.complexInfo.constructionDate = `${yearMatch[1]}-${yearMatch[2]}-${yearMatch[3]}`;
      }

      // 면적 정보 추출
      const areaMatch = pageText.match(/(\d+\.?\d*)\s*m²/);
      if (areaMatch) {
        data.complexInfo.area = areaMatch[1];
      }

      // 위치 정보 추출 (주소)
      const addressElements = document.querySelectorAll('[class*="address"], [class*="location"], [class*="addr"]');
      addressElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('시') || text.includes('구') || text.includes('동')) {
          data.complexInfo.address = text;
        }
      });

      // 가격 정보 스크래핑
      const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
      priceElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('억') || text.includes('만')) {
          data.complexInfo.prices = data.complexInfo.prices || [];
          data.complexInfo.prices.push(text);
        }
      });

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

          // 주소 패턴
          if ((text.includes('시') || text.includes('구') || text.includes('동')) && !data.complexInfo.address) {
            data.complexInfo.address = text;
          }
        });
      });

      // 매물 정보 스크래핑
      const propertyElements = document.querySelectorAll('[class*="item"], [class*="property"], [class*="listing"]');
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
        const titleEl = el.querySelector('h3, h4, .title, .name');
        if (titleEl) {
          property.title = titleEl.textContent.trim();
        }

        // 가격 찾기
        const priceEl = el.querySelector('[class*="price"], [class*="Price"]');
        if (priceEl) {
          property.price = priceEl.textContent.trim();
        }

        // 상세 정보 찾기
        const detailEl = el.querySelector('[class*="detail"], [class*="info"]');
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
        
        // 1. 전체 텍스트에서 타입 찾기 (가장 우선)
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

        // 5. 가격 패턴으로 타입 추정 (더 정확한 패턴)
        if (!typeFound && property.price) {
          const priceText = property.price.toLowerCase();
          console.log(`매물 ${index + 1} 가격 패턴 분석:`, priceText);
          
          // 전세 패턴 확인
          if (priceText.includes('전세')) {
            property.type = '전세';
            typeFound = true;
            console.log(`매물 ${index + 1} 전세로 분류`);
          }
          // 월세 패턴 확인 (슬래시가 있거나 월세가 포함된 경우)
          else if (priceText.includes('월세') || priceText.includes('/')) {
            property.type = '월세';
            typeFound = true;
            console.log(`매물 ${index + 1} 월세로 분류`);
          }
          // 매매 패턴 확인
          else if (priceText.includes('매매') || (priceText.includes('억') && !priceText.includes('월세'))) {
            property.type = '매매';
            typeFound = true;
            console.log(`매물 ${index + 1} 매매로 분류`);
          }
          // 분양 패턴 확인
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

      // 특별한 정보 추출
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

      return data;
    });

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
    // 1. 단지 검색하여 complexNo 찾기
    console.log(`단지 검색 중: ${keyword}`);
    const complexInfo = await getNaverAptComplexCode(keyword);
    
    if (!complexInfo || !complexInfo.complexNo) {
      throw new Error('해당 단지를 찾을 수 없습니다.');
    }

    console.log(`단지 정보: ${complexInfo.name} (${complexInfo.complexNo})`);

    // 2. complexNo로 매물 정보 가져오기
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
