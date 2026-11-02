import{p as Y,f as u,c as O,a as n,s as g,d as ee,e as k,as as D,g as t,q as te,t as N,i as ae,k as _,h as P,b}from"./iframe-BxvSZK0j.js";import{c as se,i as re,d as le}from"./create-runtime-stories-DF7OwIoM.js";import{S as w,a as L}from"./StateGalleryItem-BMGszy9q.js";import{l as E}from"./logo-CTAdF4cr.js";import"./library.constants-v9JM2Zdd.js";import{T as s,P as H,F as U}from"./pwa.constants-BmTqcZii.js";import{e as T}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";import"./info-Cb5cGIZT.js";import"./Icon-CSRBsjq8.js";import"./svelte-element-BAftWIbD.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";const ne={parameters:{layout:"centered",docs:{description:{component:""}}},title:"Brand/App icons"},{Story:K}=le(),oe=.3,ie=.85,i=1-H.FAVICON_PADDING,v=(1-oe)*i,B=ie*v,ce=(1-H.SPLASH_PADDING)*i,c=E.replaceAll("currentColor",U.LIGHT),q=E.replaceAll("currentColor",U.DARK),o=$=>`${Math.round($*100)}%`,de=[{background:s.BACKGROUND_LIGHT,files:"favicon.svg, favicon.ico",label:"Favicon",mark:c,note:`logo ${o(i)}`,scale:i,shape:""},{background:s.BACKGROUND_DARK,files:"favicon-dark.svg, favicon-dark.ico",label:"Favicon dark",mark:q,note:`logo ${o(i)}`,scale:i,shape:""},{background:s.BACKGROUND_LIGHT,files:"pwa-64x64, 192x192, 512x512.png",label:"PWA",mark:c,note:`logo ${o(B)}`,scale:B,shape:"rounded-full"},{background:s.BACKGROUND_LIGHT,files:"maskable-icon-512x512.png",label:"Maskable",mark:c,note:`logo ${o(v)}`,safeZone:!0,scale:v,shape:""},{background:s.BACKGROUND_LIGHT,files:"apple-touch-icon-180x180.png",label:"Apple touch",mark:c,note:`logo ${o(v)}`,scale:v,shape:"rounded-[22.5%]"}],pe=[{background:s.BACKGROUND_LIGHT,files:"apple-splash-portrait-*.png",height:2556,label:"iPhone",mark:c,note:"1179 × 2556",width:1179},{background:s.BACKGROUND_DARK,files:"apple-splash-portrait-dark-*.png",height:2556,label:"iPhone dark",mark:q,note:"1179 × 2556",width:1179},{background:s.BACKGROUND_LIGHT,files:"apple-splash-landscape-*.png",height:2048,label:"iPad landscape",mark:c,note:"2732 × 2048",width:2732}];var me=k('<div class="pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-(--fg-danger)"></div>'),he=k('<div><div class="mark aspect-square svelte-fi3xn2"></div> <!></div> <p class="mt-2 text-xs text-fg-muted"> </p>',1),fe=k('<div class="splash flex h-60 items-center justify-center rounded-control ring-1 ring-line-default svelte-fi3xn2"><div class="mark aspect-square svelte-fi3xn2"></div></div> <p class="mt-2 text-xs text-fg-muted"> </p>',1),ue=k("<!> <!>",1);function M($,F){Y(F,!1),re();var C=ue(),R=u(C);K(R,{asChild:!0,name:"Icons",children:(I,Z)=>{w(I,{columns:5,minItemWidth:"9rem",children:(x,z)=>{var d=O(),A=u(d);T(A,1,()=>de,r=>r.label,(r,e)=>{L(r,{get label(){return t(e).label},get note(){return t(e).note},children:(G,V)=>{var p=he(),a=u(p);let m;var l=b(a);let h;D(l,()=>t(e).mark,!0);var S=g(l,2);{var y=f=>{var X=me();n(f,X)};te(S,f=>{t(e).safeZone&&f(y)})}var J=g(a,2),Q=b(J);N(f=>{ae(a,1,`relative flex size-24 items-center justify-center overflow-hidden ring-1 ring-line-default ${t(e).shape??""}`,"svelte-fi3xn2"),m=_(a,"",m,{"background-color":t(e).background}),h=_(l,"",h,f),P(Q,t(e).files)},[()=>({width:o(t(e).scale)})]),n(G,p)},$$slots:{default:!0}})}),n(x,d)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={5} minItemWidth="9rem">
	{#each icons as icon (icon.label)}
		<StateGalleryItem label={icon.label} note={icon.note}>
			<div
				style:background-color={icon.background}
				class="relative flex size-24 items-center justify-center overflow-hidden ring-1 ring-line-default {icon.shape}"
			>
				<div style:width={percent(icon.scale)} class="mark aspect-square">
					{@html icon.mark}
				</div>

				{#if icon.safeZone}
					<!-- launchers may crop a maskable icon down to this 80% circle -->
					<div
						class="pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-(--fg-danger)"
					></div>
				{/if}
			</div>

			<p class="mt-2 text-xs text-fg-muted">{icon.files}</p>
		</StateGalleryItem>
	{/each}
</StateGallery>`}}});var j=g(R,2);K(j,{asChild:!0,name:"Splash screens",children:(I,Z)=>{w(I,{columns:3,minItemWidth:"8rem",children:(x,z)=>{var d=O(),A=u(d);T(A,1,()=>pe,r=>r.label,(r,e)=>{L(r,{get label(){return t(e).label},get note(){return t(e).note},children:(G,V)=>{var p=fe(),a=u(p);let m;var l=b(a);let h;D(l,()=>t(e).mark,!0);var S=g(a,2),y=b(S);N(()=>{m=_(a,"",m,{"aspect-ratio":`${t(e).width??""} / ${t(e).height??""}`,"background-color":t(e).background}),h=_(l,"",h,{width:`${ce*100}cqmin`}),P(y,t(e).files)}),n(G,p)},$$slots:{default:!0}})}),n(x,d)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={3} minItemWidth="8rem">
	{#each splashes as splash (splash.label)}
		<StateGalleryItem label={splash.label} note={splash.note}>
			<div
				style:aspect-ratio="{splash.width} / {splash.height}"
				style:background-color={splash.background}
				class="splash flex h-60 items-center justify-center rounded-control ring-1 ring-line-default"
			>
				<div style:width="{splashLogo * 100}cqmin" class="mark aspect-square">
					{@html splash.mark}
				</div>
			</div>

			<p class="mt-2 text-xs text-fg-muted">{splash.files}</p>
		</StateGalleryItem>
	{/each}
</StateGallery>`}}}),n($,C),ee()}M.__docgen={data:[],name:"AppIcons.stories.svelte"};const W=se(M,ne),Oe=["Icons","SplashScreens"],De={...W.Icons,tags:["svelte-csf-v5"]},Ne={...W.SplashScreens,tags:["svelte-csf-v5"]};export{De as Icons,Ne as SplashScreens,Oe as __namedExportsOrder,ne as default};
