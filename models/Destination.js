const mongoose = require('mongoose');
const {Schema} = mongoose;

const DestinationSchema = new Schema({
    name: {type: String, unique: true}
});

const DestinationModel = mongoose.model('Destination', DestinationSchema);

module.exports = DestinationModel;