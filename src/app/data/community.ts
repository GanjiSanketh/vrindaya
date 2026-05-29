export interface CommunityItem {
  id: number;
  image: string;
  title: string;
  subtitle: string;
}

// Place your community / lifestyle photos in src/assets/community/
// naming them community-1.png, community-2.png, etc.
// Until then, these use alternate product angles as stand-ins.
export const COMMUNITY_ITEMS: CommunityItem[] = [
  {
    id: 1,
    image: 'assets/products/001-wine-mandala-kurta/image-3.png',
    title: 'Wine Circle Elegance',
    subtitle: 'Styled by Priya, Hyderabad',
  },
  {
    id: 2,
    image: 'assets/products/002-indigo-floral-kurta-set/image-3.png',
    title: 'Indigo Summer Set',
    subtitle: 'Styled by Anjali, Mumbai',
  },
  {
    id: 3,
    image: 'assets/products/005-fuchsia-floral-kurta-set/image-3.png',
    title: 'Garden Gala',
    subtitle: 'Styled by Divya, Delhi',
  },
  {
    id: 4,
    image: 'assets/products/006-navy-mandala-kurta/image-4.png',
    title: 'Navy Tradition',
    subtitle: 'Styled by Rathi, Chennai',
  },
  {
    id: 5,
    image: 'assets/products/007-purple-embroidered-dress/image-3.png',
    title: 'Festival Ready',
    subtitle: 'Styled by Shreya, Pune',
  },
  {
    id: 6,
    image: 'assets/products/009-teal-floral-kurta-set/image-4.png',
    title: 'Teal & Bloom',
    subtitle: 'Styled by Nandini, Jaipur',
  },
];
