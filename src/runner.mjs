import { readFile } from "node:fs/promises";

const 进程号 = Number(process.argv[2]);
if (!Number.isInteger(进程号) || 进程号 <= 0) {
  console.error("无效的 ChatGPT 主进程 PID。");
  process.exit(2);
}

const 等待 = (毫秒) => new Promise((完成) => setTimeout(完成, 毫秒));
let 插口;
let 请求序号 = 0;
const 等待结果 = new Map();

async function 获取调试地址() {
  for (let 次数 = 0; 次数 < 40; 次数++) {
    try {
      const 响应 = await fetch("http://127.0.0.1:9229/json/list");
      const 列表 = await 响应.json();
      const 目标 = 列表.find((项目) => 项目.webSocketDebuggerUrl);
      if (目标) return 目标.webSocketDebuggerUrl;
    } catch {}
    await 等待(100);
  }
  throw new Error("无法连接临时调试端口 127.0.0.1:9229。该端口可能被其他程序占用。");
}

function 发送(方法, 参数 = {}) {
  return new Promise((完成, 失败) => {
    const id = ++请求序号;
    等待结果.set(id, { 完成, 失败 });
    插口.send(JSON.stringify({ id, method: 方法, params: 参数 }));
  });
}

async function 关闭目标调试端口() {
  try {
    插口?.send(JSON.stringify({
      id: ++请求序号,
      method: "Runtime.evaluate",
      params: { expression: "process._debugEnd()" }
    }));
    await 等待(150);
  } catch {}
}

try {
  process._debugProcess(进程号);
  const 地址 = await 获取调试地址();
  插口 = new WebSocket(地址);
  await new Promise((完成, 失败) => {
    插口.addEventListener("open", 完成, { once: true });
    插口.addEventListener("error", () => 失败(new Error("WebSocket 连接失败")), { once: true });
  });
  插口.addEventListener("message", (事件) => {
    const 消息 = JSON.parse(String(事件.data));
    if (!消息.id || !等待结果.has(消息.id)) return;
    const 回调 = 等待结果.get(消息.id);
    等待结果.delete(消息.id);
    if (消息.error) 回调.失败(new Error(消息.error.message));
    else 回调.完成(消息.result);
  });

  await 发送("Runtime.enable");
  const 补丁代码 = await readFile(new URL("./runtime-fix.js", import.meta.url), "utf8");
  const 返回 = await 发送("Runtime.evaluate", {
    expression: 补丁代码,
    awaitPromise: true,
    returnByValue: true
  });
  if (返回.exceptionDetails) throw new Error(返回.exceptionDetails.text || "目标进程执行失败");
  const 结果 = 返回.result?.value;
  if (!结果?.成功) throw new Error(结果?.原因 || "当前状态不符合修复条件");
  if (结果.无需修改) console.log("当前左侧栏权限状态已经正常，无需重复修复。");
  else console.log("修复成功：左侧栏权限状态已由 missing-account 恢复为 allowed。");
  console.log("无需重启 ChatGPT；本次修复只影响当前运行进程。");
} catch (错误) {
  console.error("修复失败：" + (错误?.message || 错误));
  process.exitCode = 1;
} finally {
  await 关闭目标调试端口();
  try { 插口?.close(); } catch {}
}
