export interface Product {
  id:             number;
  name:           string;
  category:       string;
  categoryId?:    string;
  price:          number;
  originalPrice:  number;
  discount:       number;
  rating:         number;
  image:          string;
  hoverImage?:    string;
  images?:        string[];
  gallery?:       string[];
  flipkartUrl:    string;
  isTrending?:    boolean;
  isNew?:         boolean;
  isBestSeller?:  boolean;
  isBestseller?:  boolean; /* legacy alias */
  description?:   string;
}

export interface Category {
  id:       string;
  name:     string;
  label?:   string;
  subtitle?: string;
  icon?:    string;
  image:    string;
  bgColor?: string;
  iconBg?:  string;
  biIcon?:  string;
}

export interface Testimonial {
  id:       number;
  name:     string;
  location: string;
  rating:   number;
  review:   string;
  image:    string;
}

export interface LookItem {
  title:      string;
  subtitle:   string;
  image:      string;
  categoryId: string;
}

export interface FeatureItem {
  icon:  string;
  title: string;
  desc:  string;
  image: string;
}
