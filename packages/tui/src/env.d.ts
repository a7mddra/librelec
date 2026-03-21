declare module "arabic-reshaper" {
  const arabicReshaper: {
    convertArabic(text: string): string;
  };
  export default arabicReshaper;
}

declare module "split-string-words" {
  export default function getWords(text: string): string[];
}
