import { Category } from '../core/models/product.model';

export const CATEGORIES: Category[] = [
  {
    id: 'All', name: 'All', label: 'All Styles', icon: '✨',
    image: '', bgColor: '', iconBg: '', biIcon: 'grid',
  },
  {
    id: 'Kurtas', name: 'Kurtas', label: 'Kurtas', icon: '👗',
    image: 'assets/products/001-wine-mandala-kurta/image-1.png',
    bgColor: 'var(--cat-kurtas-bg)', iconBg: 'var(--cat-kurtas-icon)', biIcon: 'flower1',
  },
  {
    id: 'Sets', name: 'Sets', label: 'Kurta Sets', icon: '💫',
    image: 'assets/products/002-indigo-floral-kurta-set/image-1.png',
    bgColor: 'var(--cat-sets-bg)', iconBg: 'var(--cat-sets-icon)', biIcon: 'layers',
  },
  {
    id: 'Tops', name: 'Tops', label: 'Tops', icon: '🌺',
    image: 'assets/products/003-black-gold-embroidered-kurti/image-1.png',
    bgColor: 'var(--cat-tops-bg)', iconBg: 'var(--cat-tops-icon)', biIcon: 'flower2',
  },
  {
    id: 'Dresses', name: 'Dresses', label: 'Dresses', icon: '🌸',
    image: 'assets/products/007-purple-embroidered-dress/image-1.png',
    bgColor: 'var(--cat-dresses-bg)', iconBg: 'var(--cat-dresses-icon)', biIcon: 'flower3',
  },
  {
    id: 'Sarees', name: 'Sarees', label: 'Sarees', icon: '🪷',
    image: 'assets/products/005-fuchsia-floral-kurta-set/image-1.png',
    bgColor: 'var(--cat-sarees-bg)', iconBg: 'var(--cat-sarees-icon)', biIcon: 'stars',
  },
  {
    id: 'Lehengas', name: 'Lehengas', label: 'Lehengas', icon: '👰',
    image: 'assets/products/004-pastel-stripe-kurta/image-1.png',
    bgColor: 'var(--cat-lehengas-bg)', iconBg: 'var(--cat-lehengas-icon)', biIcon: 'gem',
  },
  {
    id: 'Anarkalis', name: 'Anarkalis', label: 'Anarkalis', icon: '🎀',
    image: 'assets/products/006-navy-mandala-kurta/image-1.png',
    bgColor: 'var(--cat-anarkalis-bg)', iconBg: 'var(--cat-anarkalis-icon)', biIcon: 'diamond',
  },
];
