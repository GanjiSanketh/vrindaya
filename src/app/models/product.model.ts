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
  rating?: number;
  discount?: number;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
}
