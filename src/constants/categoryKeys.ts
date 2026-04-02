/**
 * DB 카테고리 값(한국어) → 번역 메시지 키 매핑
 *
 * DB의 words.categories에 저장된 한국어 값을
 * next-intl 메시지 키(category.xxx)로 변환할 때 사용
 */
export const CATEGORY_KEY_MAP: Record<string, string> = {
  easy: 'easy',
  normal: 'normal',
  hard: 'hard',
  '가족 행사': 'family_events',
  '가족 행사-명절': 'family_events_holidays',
  '감사하기': 'expressing_gratitude',
  '감정, 기분 표현하기': 'expressing_emotions_and_feelings',
  '개인 정보 교환하기': 'exchanging_personal_information',
  '건강': 'health',
  '건축': 'architecture',
  '경제·경영': 'economics_and_management',
  '공공 기관 이용하기(도서관)': 'using_public_institutions_library',
  '공공 기관 이용하기(우체국)': 'using_public_institutions_post_office',
  '공공 기관 이용하기(출입국 관리 사무소)': 'using_public_institutions_immigration_office',
  '공공기관 이용하기': 'using_public_institutions',
  '공연과 감상': 'performances_and_appreciation',
  '과학과 기술': 'science_and_technology',
  '교육': 'education',
  '교통 이용하기': 'using_transportation',
  '기후': 'climate',
  '길찾기': 'finding_directions',
  '날씨와 계절': 'weather_and_seasons',
  '날짜 표현하기': 'expressing_dates',
  '대중 매체': 'mass_media',
  '대중 문화': 'popular_culture',
  '문제 해결하기(분실 및 고장)': 'problem_solving_loss_and_breakdown',
  '문화 비교하기': 'comparing_cultures',
  '문화 차이': 'cultural_differences',
  '물건 사기': 'shopping',
  '법': 'law',
  '병원 이용하기': 'using_the_hospital',
  '보건과 의료': 'health_and_medicine',
  '복장 표현하기': 'describing_attire',
  '사건, 사고, 재해 기술하기': 'describing_incidents_accidents_and_disasters',
  '사과하기': 'apologizing',
  '사회 문제': 'social_issues',
  '사회 제도': 'social_systems',
  '성격 표현하기': 'describing_personality',
  '소개하기(가족 소개)': 'introducing_family',
  '소개하기(자기소개)': 'self_introduction',
  '스포츠': 'sports',
  '시간 표현하기': 'expressing_time',
  '식문화': 'food_culture',
  '실수담 말하기': 'talking_about_mistakes',
  '심리': 'psychology',
  '약국 이용하기': 'using_the_pharmacy',
  '약속하기': 'making_appointments',
  '언론': 'press_and_journalism',
  '언어': 'language',
  '여가 생활': 'leisure_activities',
  '여행': 'travel',
  '역사': 'history',
  '연애와 결혼': 'romance_and_marriage',
  '영화 보기': 'watching_movies',
  '예술': 'art',
  '외모 표현하기': 'describing_appearance',
  '외양': 'physical_appearance',
  '요리 설명하기': 'describing_cooking',
  '요일 표현하기': 'expressing_days_of_the_week',
  '위치 표현하기': 'expressing_location',
  '음식 설명하기': 'describing_food',
  '음식 주문하기': 'ordering_food',
  '인간관계': 'human_relationships',
  '인사하기': 'greetings',
  '전화하기': 'making_phone_calls',
  '정치': 'politics',
  '종교': 'religion',
  '주거 생활': 'residential_life',
  '주말 및 휴가': 'weekends_and_vacations',
  '지리 정보': 'geographical_information',
  '직업과 진로': 'jobs_and_career',
  '직장 생활': 'workplace_life',
  '집 구하기': 'finding_a_home',
  '집안일': 'household_chores',
  '철학·윤리': 'philosophy_and_ethics',
  '초대와 방문': 'invitations_and_visits',
  '취미': 'hobbies',
  '컴퓨터와 인터넷': 'computers_and_internet',
  '하루 생활': 'daily_life',
  '학교생활': 'school_life',
  '한국 생활': 'life_in_korea',
  '한국의 문학': 'korean_literature',
  '환경 문제': 'environmental_issues',
};

const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_KEY_MAP).map(([k, v]) => [v, k])
);

export function getCategoryKey(dbCategory: string): string {
  return CATEGORY_KEY_MAP[dbCategory] ?? dbCategory;
}

export function getDbCategory(urlKey: string): string {
  return REVERSE_MAP[urlKey] ?? urlKey;
}
