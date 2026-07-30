// 边缘 Worker：仅作静态资源分发器，把请求交给 Static Assets 处理。
// 不读取、不传输任何用户生辰数据；全部计算在浏览器端完成。
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
