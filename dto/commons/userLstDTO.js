class UserLst {
    constructor(total, userLst) {
      this.total = total;
      this.userLst = userLst;
    }
  
    applyData(json) {
      Object.assign(this, json);
    }
  }
  module.exports = UserLst;
  