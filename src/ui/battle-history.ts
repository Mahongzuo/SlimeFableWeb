import './battle-history.css';
import type {DailyMode} from '../../content/daily-modes';

// The registry supplies reviewed copy. Serialize DOM text nodes so all entry points share the same escaping.
export function historyDetails(mode:DailyMode, expanded=false) {
 const history=mode.history;
 if(!history)return '';
 const details=document.createElement('details');
 details.className='battle-history';
 details.open=expanded;
 const add=(tag:string,text:string)=>{const el=document.createElement(tag);el.textContent=text;details.append(el);return el;};
 add('summary',history.title+' · 事件始末');
 const body=document.createElement('div');body.className='history-pages';
 for(const [heading,text] of history.chapters){
  const h=document.createElement('h4'),p=document.createElement('p');
  h.textContent=heading;p.textContent=text;body.append(h,p);
 }
 const note=document.createElement('p');note.className='history-fiction';note.textContent=history.fiction;body.append(note);
 const sources=document.createElement('nav');sources.setAttribute('aria-label','史料来源');
 for(const [label,url] of history.sources){
  const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener';sources.append(a);
 }
 body.append(sources);details.append(body);return details.outerHTML;
}
