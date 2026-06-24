export type Profile = {
  id: string;
  name: string;
  age: number;
  city: string;
  state: string;
  height: string;
  community: string;
  profession: string;
  education: string;
  income: string;
  maritalStatus: string;
  verified: boolean;
  premium: boolean;
  matchScore: number;
  about: string;
};

export const profiles: Profile[] = [
  {
    id: 'LSDEMOFEMALE01',
    name: 'Tanvi',
    age: 29,
    city: 'Mumbai',
    state: 'Maharashtra',
    height: '164 cm',
    community: 'Maratha',
    profession: 'Product Manager',
    education: 'MBA',
    income: 'Rs. 3 - 4 Lakh p.a',
    maritalStatus: 'Never Married',
    verified: true,
    premium: false,
    matchScore: 86,
    about:
      'Family-oriented, ambitious, and grounded. Looking for a thoughtful partner who values clarity, warmth, and shared growth.',
  },
  {
    id: 'LSDEMOFEMALE02',
    name: 'Shruti',
    age: 27,
    city: 'Pune',
    state: 'Maharashtra',
    height: '156 cm',
    community: 'Khatri',
    profession: 'Marketing Manager',
    education: 'M.Com',
    income: 'Rs. 3 - 4 Lakh p.a',
    maritalStatus: 'Never Married',
    verified: true,
    premium: true,
    matchScore: 91,
    about:
      'Calm, expressive, and close to family. Enjoys meaningful conversations, travel, and building a peaceful home.',
  },
  {
    id: 'LSDEMOMALE16',
    name: 'Rudra',
    age: 33,
    city: 'Jaipur',
    state: 'Rajasthan',
    height: '184 cm',
    community: 'Agarwal',
    profession: 'Data Scientist',
    education: 'CA, ICAI',
    income: 'Rs. 3 - 5 Lakh p.a',
    maritalStatus: 'Never Married',
    verified: true,
    premium: false,
    matchScore: 78,
    about:
      'A balanced and sincere person who values family, career focus, and emotional maturity in marriage.',
  },
];
