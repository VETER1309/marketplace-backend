class AdminPool {
  constructor(admins) {
    this.admins = admins;

    this.isUsed = {}; // admin address -> is that admin rented

    this.returnAdminToGroupActions = {}; // admin address -> actions to return admin to pool
    this.contractsGroupId = 'contracts'

    this.adminToGroup = {}; // admin address -> admin groups, contract admin or collection id

    for(let admin of admins.contractAdmins) {
      this.adminToGroup[admin.address] = this.pushOrInit(this.adminToGroup[admin.address], this.contractsGroupId);
    }

    for(let collectionId of Object.keys(admins.collectionAdmins)) {
      for(let admin of admins.collectionAdmins[collectionId]) {
        this.adminToGroup[admin.address] = this.pushOrInit(this.adminToGroup[admin.address], collectionId);
      }
    }

    this.requestPendingsByGroup = {}; // admin group -> requests waiting for his release
  }

  pushOrInit(array, value) {
    if(array) {
      array.push(value);
      return array;
    }

    return [value];
  }

  async rentContractAdmin(callback) {
    await this.rentAdmin(this.admins.contractAdmins, this.contractsGroupId, callback);
  }

  async rentCollectionAdmin(collectionId, callback) {
    await this.rentAdmin(this.admins.collectionAdmins[collectionId], collectionId.toString(), callback);
  }

  rentAdmin(adminsGroup, adminsGroupId, callback) {
    if(adminsGroup) {
      while(adminsGroup.length > 0) {
        const admin = adminsGroup.shift();
        if(this.isUsed[admin.address]) {
          this.returnAdminToGroupActions[admin.address].push(() => adminsGroup.push(admin));
        }
        else {
          this.returnAdminToGroupActions[admin.address] = [() => adminsGroup.push(admin)];
          return useAdmin(admin, callback);
        }
      }
    }

    if(!this.isUsed[this.admins.escrowAdmin.address]) {
      return useAdmin(this.admins.escrowAdmin, callback);
    }

    return new Promise((resolve) => this.requestPendingsByGroup[adminsGroupId] = this.pushOrInit(this.requestPendingsByGroup[adminsGroupId], resolve))
      .then(() => this.rentAdmin(collection, adminsGroupId, callback));
  }

  async useAdmin(admin, callback) {
    this.isUsed[admin.address] = true;

    let released = false;
    const releaseOnce = () => {
      if(!released) {
        released = true;
        this.releaseAdmin(admin);
      }
    }

    try {
      const r = callback(admin, admin === this.admins.escrowAdmin, releaseOnce);
      if('then' in r) {
        return await r;
      }

      return r;
    }
    finally{
      releaseOnce();
    }

  }

  releaseAdmin(admin) {
    this.isAdminUsed[admin.address] = false;
    this.returnAdminToGroup();
    const pendingRequest = this.findPendingRequest(admin);
    pendingRequest && pendingRequest();
  }

  findPendingRequest(admin) {
    const adminGroups = admin === this.admins.escrowAdmin ? Object.keys(this.requestPendingsByGroup) : this.adminToGroup[admin.address];
    for(let group of adminGroups) {
      if(this.requestPendingsByGroup[group] && this.requestPendingsByGroup[group].length > 0) {
        const request = this.requestPendingsByGroup[group].shift();
        if(this.requestPendingsByGroup[group].length === 0) {
          delete this.requestPendingsByGroup[group];
        }
        return request;
      }
    }

    return undefined;
  }

  returnAdminToGroup(admin) {
    const releaseActions = this.returnAdminToGroupActions[admin.address];
    this.returnAdminToGroupActions[admin.address] = undefined;
    if(releaseActions) {
      for(let action of releaseActions) {
        action();
      }
    }
  }
}

module.exports = AdminPool;
