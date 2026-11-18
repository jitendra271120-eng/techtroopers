import Navbar from './Navbar';
import Footer from './Footer';
export default function Layout({ children, openAuth, hideChrome=false }){
  if (hideChrome) return children;
  return <><Navbar openAuth={openAuth}/><div className="site-main">{children}</div><Footer/></>;
}
