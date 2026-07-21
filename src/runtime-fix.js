(async () => {
  const { BrowserWindow } = process.getBuiltinModule("module")
    .createRequire(process.cwd() + "/codex-sidebar-fix.cjs")("electron");
  const 主窗口 = BrowserWindow.getAllWindows().find((窗口) =>
    窗口.webContents.getURL().startsWith("app://-")
  );
  if (!主窗口) return { 成功: false, 原因: "没有找到 Codex 主窗口" };

  return await 主窗口.webContents.executeJavaScript(String.raw`
    (async () => {
      const 根节点 = document.getElementById("root") || document.body.firstElementChild;
      const 容器键 = 根节点 && Object.keys(根节点).find((键) => 键.startsWith("__reactContainer$"));
      if (!容器键) return { 成功: false, 原因: "没有找到 React 根容器" };

      const 待检查 = [根节点[容器键]];
      const 已检查 = new Set();
      const 链候选 = [];
      while (待检查.length && 已检查.size < 20000) {
        const 节点 = 待检查.pop();
        if (!节点 || 已检查.has(节点)) continue;
        已检查.add(节点);
        const 值 = 节点.memoizedProps && 节点.memoizedProps.value;
        if (值 instanceof Map && [...值.values()].some((项目) => 项目?.store && 项目?.signalBindings)) {
          链候选.push(值);
        }
        if (节点.child) 待检查.push(节点.child);
        if (节点.sibling) 待检查.push(节点.sibling);
      }

      const 已加载资源地址 = performance.getEntriesByType("resource")
        .map((项目) => 项目.name)
        .find((地址) => /\/assets\/codex-feature-access-[^/]+\.js(?:\?|$)/.test(地址));
      // performance 资源记录可能被客户端清空；已验证版本使用下面的文件名作为后备。
      const 资源地址 = 已加载资源地址 ||
        new URL("./assets/codex-feature-access-CNXuoBTU.js", location.href).href;
      let 权限模块;
      try {
        权限模块 = await import(资源地址);
      } catch {
        return { 成功: false, 原因: "当前客户端版本的权限模块发生变化，暂不兼容" };
      }
      const 状态链 = 链候选.find((链) => 链.has(权限模块.n?.scope?.id));
      if (!状态链) return { 成功: false, 原因: "没有找到权限信号所在的 App Scope" };

      const 获取位置 = (信号) => {
        const 节点 = 状态链.get(信号.scope.id);
        return { 节点, 原子: 信号.resolve(节点, 状态链) };
      };
      const 输入位置 = 获取位置(权限模块.n);
      const 状态位置 = 获取位置(权限模块.t);
      const 允许位置 = 获取位置(权限模块.r);
      const 原输入 = 输入位置.节点.store.get(输入位置.原子);
      const 原状态 = 状态位置.节点.store.get(状态位置.原子);
      const 原本已允许 = 允许位置.节点.store.get(允许位置.原子);

      if (原本已允许 === true) {
        return { 成功: true, 无需修改: true, 修改前: { status: 原状态?.status } };
      }

      if (原输入?.authMethod !== "chatgpt" || 原输入?.supportedSurface !== true ||
          原状态?.status !== "denied" || 原状态?.reason !== "missing-account") {
        return {
          成功: false,
          原因: "当前状态不是本工具处理的 missing-account 问题",
          状态:原状态?.status,
          拒绝原因:原状态?.reason
        };
      }

      const 原值备份键 = Symbol.for("codex.sidebar.fix.original-input");
      const 写函数备份键 = Symbol.for("codex.sidebar.fix.original-writer");
      if (!window[原值备份键]) window[原值备份键] = 原输入;
      if (!window[写函数备份键]) {
        const 原写函数 = 输入位置.原子.write;
        window[写函数备份键] = 原写函数;
        输入位置.原子.write = function(读取, 写入, 传入值) {
          const 旧值 = 读取(this);
          const 计算值 = typeof 传入值 === "function" ? 传入值(旧值) : 传入值;
          const 修正值 = 计算值?.authMethod === "chatgpt" &&
            计算值?.supportedSurface === true && !计算值?.accountId
            ? { ...计算值, accountId: "local-sidebar-runtime-fix", plan: "free" }
            : 计算值;
          return 原写函数.call(this, 读取, 写入, 修正值);
        };
      }

      输入位置.节点.store.set(输入位置.原子, {
        ...原输入,
        accountId: "local-sidebar-runtime-fix",
        plan: "free"
      });
      await new Promise((完成) => setTimeout(完成, 250));
      const 新状态 = 状态位置.节点.store.get(状态位置.原子);
      const 已允许 = 允许位置.节点.store.get(允许位置.原子);
      return {
        成功: 已允许 === true,
        原因: 已允许 === true ? undefined : "写入后权限状态仍未恢复",
        修改前: { status: 原状态?.status, reason: 原状态?.reason },
        修改后: { status: 新状态?.status, reason: 新状态?.reason }
      };
    })()
  `, true);
})()
