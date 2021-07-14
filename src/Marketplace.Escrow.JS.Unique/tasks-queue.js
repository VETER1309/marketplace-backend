let tasks = [];
const parallelismDegree = 20;

async function enqueue(promiseFunction, cancellationToken) {
  while(tasks.length >= parallelismDegree) {
    const t = await Promise.race(tasks);
  }

  if(cancellationToken.cancellationRequested) {
    return;
  }
  const promise = promiseFunction();
  tasks.push(promise);
  const remove = () => {
    tasks = tasks.filter(t => t !== promise);
  };

  promise.then(r => {
    remove();
    return r;
  }, err => {
    remove();
    throw err;
  });
}

async function waitAllTasks() {
  await Promise.all(tasks);
}

module.exports = {
  enqueue,
  waitAllTasks
};
