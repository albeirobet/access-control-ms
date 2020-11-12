class Account {
    constructor(authorities, user) {
      this.authorities = authorities;
      this.user = user;
    }
  
    applyData(json) {
      Object.assign(this, json);
    }
  }
  module.exports = Account;
  