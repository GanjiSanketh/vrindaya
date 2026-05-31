export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  images?: string[];
  flipkartUrl: string;
  isTrending?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  rating?: number;
  discount?: number;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  label: string;   /* display name (e.g. "Kurta Sets") */
  icon: string;    /* emoji chip */
  image: string;   /* product photo */
  bgColor: string; /* color-grid card background */
  iconBg: string;  /* icon circle background */
  biIcon: string;  /* Bootstrap Icon name without "bi-" */
}
