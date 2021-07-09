function counter(maxValue) {
  let index = -1;
  return () => {
    index = (index + 1)%maxValue;
    return index;
  }
}

class AdminPool {
  constructor(mainAdmin, otherAdmins) {
    this.mainAdmin = mainAdmin;
    this.otherAdmins = otherAdmins;

    this.allAdmins = [mainAdmin, ...otherAdmins];
    this.isAdminUsed = Array(this.allAdmins.length).fill(false);
    this.nextIndex = counter(this.allAdmins.length);

    this.freeAdminsCount = this.allAdmins.length;
    this.adminRequests = [];
  }


  async rent(callback) {
    const freeAdminIndex = await this.findFreeAdmin();
    try {
      this.rentAdmin(freeAdminIndex);
      const isMainAdmin = freeAdminIndex === 0;
      const callbackResult = callback(this.allAdmins[freeAdminIndex], isMainAdmin);
      if('then' in callbackResult) {
        await callbackResult;
      }
    }
    finally{
      this.releaseAdmin(freeAdminIndex);
    }
  }

  rentAdmin(index) {
    this.freeAdminsCount--;
    this.isAdminUsed[index] = true;
  }

  releaseAdmin(index) {
    this.freeAdminsCount++;
    this.isAdminUsed[index] = false;
    if(this.adminRequests.length > 0) {
      const nextAdminRequest = this.adminRequests.shift();
      nextAdminRequest();
    }
  }

  findFreeAdmin() {
    if(this.freeAdminsCount > 0) {
      let freeAdminIndex = 0;
      do {
        freeAdminIndex = this.nextIndex();
      } while(!this.isAdminUsed[freeAdminIndex]);

      return Promise.resolve(freeAdminIndex);
    }

    return new Promise((resolve, reject) => {
      this.adminRequests.push(resolve);
    }).then(() => this.findFreeAdmin());
  }
}
