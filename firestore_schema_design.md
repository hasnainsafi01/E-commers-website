# MyMart Firestore Database Schema Design

This document details the optimized collection structures, schemas, data types, indexes, and query patterns for the MyMart e-commerce application.

---

## 1. Collection Structures

### `users` (Top-level Collection)
Stores authenticated user profiles, registration details, address books, and administrative/curator role assignments.
* **Path**: `/users/{uid}`
* **Schema**:
```typescript
{
  uid: string;                 // Firebase Auth UID
  name: string;                // Full name (e.g. "John Doe")
  displayName: string;         // Name displayed on reviews and UI
  email: string;               // Registered email address
  photoURL: string;            // Cloudinary or UI-avatar URL
  role: string;                // Access privileges: 'admin' | 'curator' | 'user'
  phone: string;               // Optional contact number
  bio: string;                 // Short user description
  profileCompleted: boolean;   // Completion flag
  welcomeShown: boolean;       // Welcome walkthrough flag
  createdAt: timestamp;        // Registration date
  lastLogin: timestamp;        // Last active timestamp
  
  // Shipping details map
  streetAddress?: string;
  houseNumber?: string;
  flatNumber?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}
```

### `products` (Top-level Collection)
Stores the store inventory catalog, including pricing (PKR), stock counts, categories, and image assets.
* **Path**: `/products/{productId}`
* **Schema**:
```typescript
{
  name: string;                // Product title
  description: string;         // HTML or text description
  price: number;               // Unit price in PKR
  stock: number;               // Remaining units
  category: string;            // Category reference (e.g., 'shoes', 'bags')
  images: array<string>;       // URLs of images uploaded to Cloudinary
  createdAt: timestamp;        // Creation date
  updatedAt: timestamp;        // Last modification date
}
```

### `cart` (Subcollection Pattern)
Stores the active shopping carts per user. Using a subcollection scales infinitely and eliminates cross-user data leakage.
* **Path**: `/cart/{uid}/items/{productId}`
* **Schema**:
```typescript
{
  productId: string;           // Reference to product document
  name: string;                // Cached product name (prevents joins)
  price: number;               // Unit price in PKR
  quantity: number;            // Selected units to purchase
  image: string;               // Primary product image URL
  addedAt: timestamp;          // Added timestamp
}
```

### `favorites` (Subcollection Pattern)
Stores user wishlists. Similar to cart, this is isolated to ensure rapid querying and high security.
* **Path**: `/favorites/{uid}/items/{productId}`
* **Schema**:
```typescript
{
  productId: string;           // Reference to product document
  name: string;                // Cached product name
  price: number;               // Unit price in PKR
  image: string;               // Primary product image URL
  addedAt: timestamp;          // Added timestamp
}
```

### `orders` (Top-level Collection)
Stores processed purchases, customer checkout information, delivery tracking status, and fulfillment updates.
* **Path**: `/orders/{orderId}`
* **Schema**:
```typescript
{
  orderId: string;             // Generated order ID (e.g. random or sequentially modeled)
  userId: string;              // Client UID
  customerName: string;        // Client display name
  customerEmail: string;       // Client email
  totalAmount: number;         // Total order amount in PKR
  status: string;              // Fulfillment state: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
  createdAt: timestamp;        // Purchase date
  updatedAt: timestamp;        // Status update date
  
  // Array of purchased items (snapshots of products at purchase time)
  items: array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  
  // Delivery address details
  shippingAddress: {
    fullname: string;
    phone: string;
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
  };
}
```

### `reviews` (Nested Subcollection / Collection Group)
Stores user-written evaluations of catalog items. Nested under the target product, but queryable globally for admin moderation via a Collection Group query.
* **Path**: `/products/{productId}/reviews/{reviewId}`
* **Schema**:
```typescript
{
  reviewId: string;            // Generated review ID
  productId: string;           // Reference to parent product
  productName: string;         // Cached product name (for global lists)
  uid: string;                 // Reviewer UID
  userName: string;            // Reviewer display name
  userEmail: string;           // Reviewer email address
  rating: number;              // Numeric score: 1 | 2 | 3 | 4 | 5
  reviewText: string;          // Comments/feedback
  createdAt: timestamp;        // Publication date
}
```

### `categories` (Top-level Collection)
Stores categories for filtering catalog items.
* **Path**: `/categories/{categoryId}`
* **Schema**:
```typescript
{
  name: string;                // Display name (e.g. "Bags")
  description: string;         // Description of items in this category
  image: string;               // Category header image URL
  createdAt: timestamp;        // Creation date
}
```

---

## 2. Key Firestore Indexes

To ensure peak search performance and avoid query errors, the following indexes are required:

### Single Field Indexes
* `/orders`: `userId` (for user order history lists)
* `/products`: `category` (for category page grids)

### Composite Indexes
* Collection: `orders`
  * Fields: `userId` (Ascending), `createdAt` (Descending)
  * Purpose: Fetch user orders sorted newest to oldest.
* Collection: `products`
  * Fields: `category` (Ascending), `createdAt` (Descending)
  * Purpose: Load products by category sorted by newness.

### Collection Group Indexes
* Collection: `reviews` (Group)
  * Fields: `createdAt` (Descending)
  * Purpose: Moderation feed list for all products sorted by newness.

---

## 3. Real-Time Synchronization Patterns

* **Cart & Wishlist updates**: Bind listeners using `onSnapshot(collection(db, 'cart', uid, 'items'), callback)` for real-time quantity/item updates.
* **Product Stock levels**: In `stock.js`, listen to inventory changes in real-time to alert curators instantly of low-stock thresholds.
* **Orders Fulfillment**: Bind listeners using `onSnapshot` on the user's orders page to animate order timeline state progression as curators transition order status.
