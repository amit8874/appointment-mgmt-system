import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Doctor from './models/Doctor.js';
import Review from './models/Review.js';

dotenv.config();

const mockReviews = [
  { patientName: "Rahul Sharma", comment: "Excellent doctor, very patient and explains everything clearly.", rating: 5, isLike: true },
  { patientName: "Anita Desai", comment: "Great experience. The clinic was very clean and the staff was professional.", rating: 5, isLike: true },
  { patientName: "Sanjay Gupta", comment: "Highly recommend. Helped me with my chronic back pain effectively.", rating: 4, isLike: true },
  { patientName: "Priya Verma", comment: "Good consultation, though the wait time was a bit long.", rating: 4, isLike: true },
  { patientName: "Amit Patel", comment: "Very knowledgeable and friendly. Felt at ease during the whole process.", rating: 5, isLike: true },
  { patientName: "Sneha Reddy", comment: "Effective treatment. I'm feeling much better now. Thank you!", rating: 5, isLike: true },
  { patientName: "Vikram Singh", comment: "Professional approach. Answered all my queries patiently.", rating: 4, isLike: true },
];

const seedReviews = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors.`);

    for (const doctor of doctors) {
      // Clear existing reviews for this doctor to avoid duplicates if re-running
      await Review.deleteMany({ doctorId: doctor.doctorId });

      // Pick 3-5 random reviews
      const count = Math.floor(Math.random() * 3) + 3;
      const selectedReviews = [];
      const tempMock = [...mockReviews];
      
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * tempMock.length);
        const reviewData = tempMock.splice(randomIndex, 1)[0];
        selectedReviews.push({
          ...reviewData,
          doctorId: doctor.doctorId,
          organizationId: doctor.organizationId
        });
      }

      await Review.insertMany(selectedReviews);
      
      // Update doctor with likesPercentage and totalStories
      const likes = selectedReviews.filter(r => r.isLike).length;
      const total = selectedReviews.length;
      const percentage = Math.round((likes / total) * 100);
      
      doctor.likesPercentage = percentage;
      doctor.totalStories = total;
      await doctor.save();
      
      console.log(`Seeded ${total} reviews for Dr. ${doctor.name} (Likes: ${percentage}%)`);
    }

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedReviews();
