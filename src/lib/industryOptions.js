/** Mirrors consumer-facing category keys (StoreDetail coupons, discovery filters). */
export const INDUSTRY_OPTIONS = {
  clothing: { label: 'Clothing & Fashion', typeLabel: 'Type of clothing', types: [
    { value: 'mens', label: "Men's Fashion" }, { value: 'womens', label: "Women's Fashion" },
    { value: 'kids', label: 'Kids & Baby' }, { value: 'sportswear', label: 'Activewear & Sports' },
    { value: 'shoes', label: 'Shoes & Footwear' }, { value: 'accessories', label: 'Accessories' },
    { value: 'mixed', label: 'Mixed/Department' }, { value: 'other', label: 'Others' }
  ]},
  food: { label: 'Restaurant & Food', typeLabel: 'Type of cuisine', types: [
    { value: 'korean', label: 'Korean' }, { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' }, { value: 'western', label: 'Western/American' },
    { value: 'italian', label: 'Italian' }, { value: 'fast_food', label: 'Fast Food' },
    { value: 'cafe', label: 'Cafe & Bakery' }, { value: 'dessert', label: 'Dessert & Ice Cream' },
    { value: 'southeast_asian', label: 'Southeast Asian' }, { value: 'indian', label: 'Indian' },
    { value: 'other', label: 'Others' }
  ]},
  supermarket: { label: 'Supermarket & Grocery', typeLabel: 'Store type', types: [
    { value: 'general_supermarket', label: 'General Supermarket' }, { value: 'convenience', label: 'Convenience Store' },
    { value: 'fresh_produce', label: 'Fresh Produce' }, { value: 'organic', label: 'Organic & Health' },
    { value: 'frozen', label: 'Frozen Goods' }, { value: 'other', label: 'Others' }
  ]},
  pharmacy: { label: 'Pharmacy & Health', typeLabel: 'Focus area', types: [
    { value: 'pharmacy', label: 'Pharmacy/Drugstore' }, { value: 'supplements', label: 'Vitamins & Supplements' },
    { value: 'medical_supplies', label: 'Medical Supplies' }, { value: 'optics', label: 'Optical/Eyewear' },
    { value: 'other', label: 'Others' }
  ]},
  electronics: { label: 'Electronics', typeLabel: 'Product type', types: [
    { value: 'mobile', label: 'Mobile & Accessories' }, { value: 'computers', label: 'Computers & IT' },
    { value: 'appliances', label: 'Home Appliances' }, { value: 'gaming', label: 'Gaming & Consoles' },
    { value: 'other', label: 'Others' }
  ]},
  services: { label: 'Services', typeLabel: 'Service type', types: [
    { value: 'spa', label: 'Spa & Wellness' }, { value: 'cleaning', label: 'Cleaning Services' },
    { value: 'repair', label: 'Repair Services' }, { value: 'laundry', label: 'Laundry & Dry Cleaning' },
    { value: 'other', label: 'Others' }
  ]},
  hotel_travel: { label: 'Hotel & Travel', typeLabel: 'Business type', types: [
    { value: 'theme_park', label: 'Theme Park' }, { value: 'hotel', label: 'Hotel' },
    { value: 'other', label: 'Others' }
  ]},
  beauty_spa: { label: 'Beauty & Spa', typeLabel: 'Service type', types: [
    { value: 'makeup', label: 'Makeup' }, { value: 'nails', label: 'Nails' },
    { value: 'spas', label: 'Spas' }, { value: 'hair', label: 'Hair' },
    { value: 'brows_lashes', label: 'Brows & Lashes' }, { value: 'massage', label: 'Massage' },
    { value: 'face_skin', label: 'Face & Skin' }, { value: 'other', label: 'Others' }
  ]},
  pet: { label: 'Pet', typeLabel: 'Business type', types: [
    { value: 'pet_store', label: 'Pet Store' }, { value: 'other', label: 'Others' }
  ]},
  baby_kids: { label: 'Baby & Kids', typeLabel: 'Business type', types: [
    { value: 'kids_baby', label: 'Kids & Baby' }, { value: 'other', label: 'Others' }
  ]},
  entertainment: { label: 'Entertainment', typeLabel: 'Business type', types: [
    { value: 'gaming', label: 'Gaming & Consoles' }, { value: 'other', label: 'Others' }
  ]},
  luxury: { label: 'Luxury', typeLabel: 'Business type', types: [
    { value: 'accessories', label: 'Accessories' }, { value: 'other', label: 'Others' }
  ]}
}
