const mongoose = require('mongoose');
const {Schema} = mongoose;

const CategorySchema = new Schema({
    name: String
});

const CategoryModel = mongoose.model('Category', CategorySchema);

module.exports = CategoryModel;