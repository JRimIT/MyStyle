import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/category.model.js';

dotenv.config();

// Sample categories data
const categoriesData = [
    {
        name: 'Áo',
        description: 'Các loại áo thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
        order: 1,
        isActive: true,
    },
    {
        name: 'Quần',
        description: 'Các loại quần thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800',
        order: 2,
        isActive: true,
    },
    {
        name: 'Váy',
        description: 'Váy đầm thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
        order: 3,
        isActive: true,
    },
    {
        name: 'Phụ kiện',
        description: 'Phụ kiện thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800',
        order: 4,
        isActive: true,
    },
    {
        name: 'Giày dép',
        description: 'Giày và dép thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
        order: 5,
        isActive: true,
    },
    {
        name: 'Túi xách',
        description: 'Túi xách và balo thời trang',
        imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
        order: 6,
        isActive: true,
    },
    {
        name: 'Đồ thể thao',
        description: 'Trang phục thể thao',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
        order: 7,
        isActive: true,
    },
    {
        name: 'Đồ ngủ',
        description: 'Đồ ngủ và đồ mặc nhà',
        imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
        order: 8,
        isActive: true,
    },
];

async function seedCategories() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/MyStyle');
        console.log('✅ Connected to MongoDB successfully!');

        // Clear existing categories
        console.log('🗑️  Clearing existing categories...');
        await Category.deleteMany({});
        console.log('✅ Cleared existing categories!');

        // Insert new categories
        console.log('📝 Inserting new categories...');
        const categories = await Category.insertMany(categoriesData);
        console.log(`✅ Successfully inserted ${categories.length} categories!`);

        // Display created categories
        console.log('\n📋 Created Categories:');
        categories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name} (slug: ${cat.slug})`);
        });

        console.log('\n✨ Seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedCategories();
