import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
export default function Layout() {
  const [open,setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if(location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      else { window.scrollTo(0,0); document.getElementById('main-content')?.focus({preventScroll:true}); }
    },0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);
  const close = () => setOpen(false);
  return <><a className="skip-link" href="#main-content">跳至主要内容</a><header className="site-header"><div className="shell header-inner"><Link to="/" className="brand" aria-label="Stellar Portfolio 首页" onClick={close}><span className="brand-star" aria-hidden="true">✳</span> stellar<span className="brand-dot">.</span></Link><button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(v => !v)}>{open ? '关闭 ✕' : '菜单 ☰'}</button><nav id="main-nav" aria-label="主导航" className={open ? 'nav is-open' : 'nav'}><NavLink to="/" end onClick={close}>首页</NavLink><Link to="/#about" onClick={close}>关于</Link><Link to="/#skills" onClick={close}>技能</Link><Link to="/#projects" onClick={close}>作品</Link><NavLink to="/blog" onClick={close}>研究札记</NavLink><Link to="/#contact" className="nav-contact" onClick={close}>联系我 <span aria-hidden="true">↗</span></Link></nav></div></header><main id="main-content" tabIndex={-1}><Outlet key={location.pathname + location.search}/></main><footer className="shell site-footer"><Link className="footer-brand" to="/">✳ stellar.</Link><span>保持好奇，持续构建。</span><span>© {new Date().getFullYear()} Stellar Portfolio</span></footer></>;
}


