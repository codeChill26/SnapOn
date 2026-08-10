const TaskQueryController = require('./TaskQueryController');
const TaskPublishController = require('./TaskPublishController');
const TaskActionController = require('./TaskActionController');

const taskController = {
  ...TaskQueryController,
  ...TaskPublishController,
  ...TaskActionController
};

module.exports = taskController;
