import {instruments} from '../templates/season-instruments';

/** A preview has no reward. The real operation is unlocked by the owning level. */
export function seasonExhibit(id:string){
  const spec=instruments[id];let busy=false,finished=false;
  return {
    enabled:!!spec,
    preview(parent:HTMLElement|null){
      if(!spec||!parent||parent.querySelector('.season-preview'))return;
      const button=document.createElement('button');button.type='button';button.className='season-preview';button.textContent='试一试 · '+spec.title;
      button.onclick=async()=>{button.blur();const ui=await import('./season-instrument');await ui.previewInstrument(id);};
      parent.append(button);
    },
    async run(){
      if(!spec||finished)return;
      const ui=await import('./season-instrument');await ui.completeInstrument(id);finished=true;
    },
    finish(next:()=>void){
      if(!spec||finished){next();return;}
      if(busy)return;busy=true;
      void this.run().then(next).finally(()=>{busy=false;});
    }
  };
}
