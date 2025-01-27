import mongoose from 'mongoose';

const HistorySchema = new mongoose.Schema({
    userRequest: {
        api: { type: String, required: true }, // API name (e.g., "Weather", "Car")
        input: { type: Object, required: true }, // User input data
    },
    response: { type: Object, required: true }, // API response
    createdAt: { type: Date, default: Date.now }, // Timestamp
});

const History = mongoose.model('History', HistorySchema);
export default History;
