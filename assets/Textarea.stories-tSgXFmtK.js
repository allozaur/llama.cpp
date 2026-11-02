import{p as $,f as v,s,a as y,d as _,e as h}from"./iframe-BxvSZK0j.js";import{c as S,i as b,d as G}from"./create-runtime-stories-DF7OwIoM.js";import{S as I,a as t}from"./StateGalleryItem-BMGszy9q.js";import{T as a}from"./textarea-q08Yt5sv.js";import"./preload-helper-PPVm8Dsz.js";import"./input-BVFa53i-.js";import"./this-PF-vsikk.js";const x={component:a,parameters:{layout:"centered"},title:"Design system/Forms/Textarea"},{Story:T}=G();var D=h("<!> <!> <!> <!>",1);function d(u,m){$(m,!1),b(),T(u,{asChild:!0,name:"Default",children:(p,P)=>{I(p,{columns:2,children:(c,E)=>{var r=D(),n=v(r);t(n,{label:"Empty",children:(e,l)=>{a(e,{placeholder:"You are a helpful assistant."})},$$slots:{default:!0}});var o=s(n,2);t(o,{label:"Filled",children:(e,l)=>{a(e,{value:"You are a concise assistant. Answer in plain English and cite sources."})},$$slots:{default:!0}});var i=s(o,2);t(i,{label:"Invalid",children:(e,l)=>{a(e,{"aria-invalid":"true",value:"{ not valid json"})},$$slots:{default:!0}});var f=s(i,2);t(f,{label:"Disabled",children:(e,l)=>{a(e,{disabled:!0,value:"Set by the server"})},$$slots:{default:!0}}),y(c,r)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2}>
	<StateGalleryItem label="Empty">
		<Textarea placeholder="You are a helpful assistant." />
	</StateGalleryItem>

	<StateGalleryItem label="Filled">
		<Textarea value="You are a concise assistant. Answer in plain English and cite sources." />
	</StateGalleryItem>

	<StateGalleryItem label="Invalid">
		<Textarea aria-invalid="true" value="{'{'} not valid json" />
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<Textarea disabled value="Set by the server" />
	</StateGalleryItem>
</StateGallery>`}}}),_()}d.__docgen={data:[],name:"Textarea.stories.svelte"};const g=S(d,x),O=["Default"],R={...g.Default,tags:["svelte-csf-v5"]};export{R as Default,O as __namedExportsOrder,x as default};
