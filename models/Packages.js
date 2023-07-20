const mongoose = require('mongoose');
const {Schema} = mongoose;

const PackagesSchema = new Schema({
    title: String,
    destination: {type: mongoose.Schema.Types.ObjectId, require: true, ref: 'Destination'},
    category: {type: mongoose.Schema.Types.ObjectId, require: true, ref: 'Category'},
    photos: [String],
    itinerary: [String],
    highlights: String,
    inclusion: String,
    exclusion: String,
    price: Number,
    type: String,
});

const PackagesModel = mongoose.model('Packages', PackagesSchema);

module.exports = PackagesModel;