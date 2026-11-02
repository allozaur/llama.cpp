import{p as A,f as C,a3 as r,s as l,g as v,x as $,a as y,d as T,e as G}from"./iframe-BxvSZK0j.js";import{c as L,i as P,d as E}from"./create-runtime-stories-DF7OwIoM.js";import{S as N,a as n}from"./StateGalleryItem-BMGszy9q.js";import{C as a}from"./ChatTabsItem-BWqVFd0V.js";import{a as w,N as B}from"./chat-tabs.constants-BXUE-QDX.js";import{h as H}from"./library.constants-v9JM2Zdd.js";import"./preload-helper-PPVm8Dsz.js";import"./css-classes.constants-B-GZedvn.js";import"./x-DXCCWZ3I.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";import"./square-BwMbYbuj.js";import"./info-Cb5cGIZT.js";import"./ui.enums-DjR_vYxk.js";import"./settings-vDMD8fT9.js";import"./wrench-C98Yxdx8.js";const W={component:a,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatTabs/ChatTabsItem"},{Story:q}=E(),i={href:"#/chat/conv-1",id:"conv-1",name:"Rust borrow checker"},s={onActivate:e=>console.log("activate",e),onClose:e=>console.log("close",e),onStop:e=>console.log("stop",e)};var x=G("<!> <!> <!> <!> <!> <!>",1);function _(e,f){A(f,!1),P(),q(e,{asChild:!0,name:"States",children:(S,R)=>{N(S,{columns:3,children:(g,k)=>{var m=x(),c=C(m);n(c,{label:"Idle",note:"dimmed until hovered",children:(t,o)=>{a(t,r(()=>s,{get tab(){return i}}))},$$slots:{default:!0}});var h=l(c,2);n(h,{label:"Active",children:(t,o)=>{a(t,r(()=>s,{isActive:!0,get tab(){return i}}))},$$slots:{default:!0}});var p=l(h,2);n(p,{label:"New chat",children:(t,o)=>{{let d=$(()=>({href:"#/",icon:H,id:B,name:w}));a(t,r(()=>s,{isActive:!0,get tab(){return v(d)}}))}},$$slots:{default:!0}});var u=l(p,2);n(u,{label:"Loading",note:"hover the spinner to stop",children:(t,o)=>{a(t,r(()=>s,{isLoading:!0,get tab(){return i}}))},$$slots:{default:!0}});var b=l(u,2);n(b,{label:"Active, loading",children:(t,o)=>{a(t,r(()=>s,{isActive:!0,isLoading:!0,get tab(){return i}}))},$$slots:{default:!0}});var I=l(b,2);n(I,{label:"Long name",note:"truncated",children:(t,o)=>{{let d=$(()=>({...i,name:"A very long conversation title that has to be truncated inside the tab"}));a(t,r(()=>s,{isActive:!0,get tab(){return v(d)}}))}},$$slots:{default:!0}}),y(g,m)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={3}>
	<StateGalleryItem label="Idle" note="dimmed until hovered">
		<ChatTabsItem {...handlers} {tab} />
	</StateGalleryItem>

	<StateGalleryItem label="Active">
		<ChatTabsItem {...handlers} isActive {tab} />
	</StateGalleryItem>

	<StateGalleryItem label="New chat">
		<ChatTabsItem
			{...handlers}
			isActive
			tab={{ href: '#/', icon: SquarePen, id: NEW_CHAT_TAB_ID, name: NEW_CHAT_LABEL }}
		/>
	</StateGalleryItem>

	<StateGalleryItem label="Loading" note="hover the spinner to stop">
		<ChatTabsItem {...handlers} isLoading {tab} />
	</StateGalleryItem>

	<StateGalleryItem label="Active, loading">
		<ChatTabsItem {...handlers} isActive isLoading {tab} />
	</StateGalleryItem>

	<StateGalleryItem label="Long name" note="truncated">
		<ChatTabsItem
			{...handlers}
			isActive
			tab={{
				...tab,
				name: 'A very long conversation title that has to be truncated inside the tab'
			}}
		/>
	</StateGalleryItem>
</StateGallery>`}}}),T()}_.__docgen={data:[],name:"ChatTabsItem.stories.svelte"};const D=L(_,W),nt=["States"],st={...D.States,tags:["svelte-csf-v5"]};export{st as States,nt as __namedExportsOrder,W as default};
