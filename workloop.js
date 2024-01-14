
let taskId = 0;

/**
 * 任务调度
 * @param {IdleDeadline} deadline 
 */
function workLoop(deadline) {
  taskId++;

  //  是否中断
  let shouldYield = false;

  while (!shouldYield) {
    //  run task
    console.log(`taskId:${taskId} is runing task`);

    //  如果浏览器剩余的空闲时间不够，就中断
    shouldYield = deadline.timeRemaining() < 1;
  }

  //  任务放到下次执行
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)