export type Category =
  // difficulty
  | 'easy'
  | 'normal'
  | 'hard'
  // topics
  | 'family_events'
  | 'family_events_holidays'
  | 'expressing_gratitude'
  | 'expressing_emotions_and_feelings'
  | 'exchanging_personal_information'
  | 'health'
  | 'architecture'
  | 'economics_and_management'
  | 'using_public_institutions_library'
  | 'using_public_institutions_post_office'
  | 'using_public_institutions_immigration_office'
  | 'using_public_institutions'
  | 'performances_and_appreciation'
  | 'science_and_technology'
  | 'education'
  | 'using_transportation'
  | 'climate'
  | 'finding_directions'
  | 'weather_and_seasons'
  | 'expressing_dates'
  | 'mass_media'
  | 'popular_culture'
  | 'problem_solving_loss_and_breakdown'
  | 'comparing_cultures'
  | 'cultural_differences'
  | 'shopping'
  | 'law'
  | 'using_the_hospital'
  | 'health_and_medicine'
  | 'describing_attire'
  | 'describing_incidents_accidents_and_disasters'
  | 'apologizing'
  | 'social_issues'
  | 'social_systems'
  | 'describing_personality'
  | 'introducing_family'
  | 'self_introduction'
  | 'sports'
  | 'expressing_time'
  | 'food_culture'
  | 'talking_about_mistakes'
  | 'psychology'
  | 'using_the_pharmacy'
  | 'making_appointments'
  | 'press_and_journalism'
  | 'language'
  | 'leisure_activities'
  | 'travel'
  | 'history'
  | 'romance_and_marriage'
  | 'watching_movies'
  | 'art'
  | 'describing_appearance'
  | 'physical_appearance'
  | 'describing_cooking'
  | 'expressing_days_of_the_week'
  | 'expressing_location'
  | 'describing_food'
  | 'ordering_food'
  | 'human_relationships'
  | 'greetings'
  | 'making_phone_calls'
  | 'politics'
  | 'religion'
  | 'residential_life'
  | 'weekends_and_vacations'
  | 'geographical_information'
  | 'jobs_and_career'
  | 'workplace_life'
  | 'finding_a_home'
  | 'household_chores'
  | 'philosophy_and_ethics'
  | 'invitations_and_visits'
  | 'hobbies'
  | 'computers_and_internet'
  | 'daily_life'
  | 'school_life'
  | 'life_in_korea'
  | 'korean_literature'
  | 'environmental_issues';

export const CATEGORY_GROUP = {
  difficulty: ['easy', 'normal', 'hard'],
  topic: [
    '가족 행사', '가족 행사-명절', '감사하기',
    '감정, 기분 표현하기', '개인 정보 교환하기',
    '건강', '건축', '경제·경영',
    '공공 기관 이용하기(도서관)', '공공 기관 이용하기(우체국)',
    '공공 기관 이용하기(출입국 관리 사무소)', '공공기관 이용하기',
    '공연과 감상', '과학과 기술', '교육',
    '교통 이용하기', '기후', '길찾기',
    '날씨와 계절', '날짜 표현하기', '대중 매체',
    '대중 문화', '문제 해결하기(분실 및 고장)', '문화 비교하기',
    '문화 차이', '물건 사기', '법',
    '병원 이용하기', '보건과 의료', '복장 표현하기',
    '사건, 사고, 재해 기술하기', '사과하기', '사회 문제',
    '사회 제도', '성격 표현하기', '소개하기(가족 소개)',
    '소개하기(자기소개)', '스포츠', '시간 표현하기',
    '식문화', '실수담 말하기', '심리',
    '약국 이용하기', '약속하기', '언론',
    '언어', '여가 생활', '여행',
    '역사', '연애와 결혼', '영화 보기',
    '예술', '외모 표현하기', '외양',
    '요리 설명하기', '요일 표현하기', '위치 표현하기',
    '음식 설명하기', '음식 주문하기', '인간관계',
    '인사하기', '전화하기', '정치',
    '종교', '주거 생활', '주말 및 휴가',
    '지리 정보', '직업과 진로', '직장 생활',
    '집 구하기', '집안일', '철학·윤리',
    '초대와 방문', '취미', '컴퓨터와 인터넷',
    '하루 생활', '학교생활', '한국 생활',
    '한국의 문학', '환경 문제',
  ],
} as const satisfies Record<string, readonly string[]>;

export type CategoryGroupKey = keyof typeof CATEGORY_GROUP;

export const DIFFICULTIES: Category[] = ['easy', 'normal', 'hard'];

export const isDifficulty = (category: string): boolean =>
  DIFFICULTIES.includes(category as Category);
