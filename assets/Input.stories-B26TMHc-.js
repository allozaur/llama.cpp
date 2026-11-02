import{p as y,f as I,s as r,a as h,d as v,e as _}from"./iframe-BxvSZK0j.js";import{c as S,i as b,d as G}from"./create-runtime-stories-DF7OwIoM.js";import{S as D,a as l}from"./StateGalleryItem-BMGszy9q.js";import{I as t}from"./input-CLr4-AYd.js";import"./preload-helper-PPVm8Dsz.js";import"./input-BVFa53i-.js";import"./this-PF-vsikk.js";const P={component:t,parameters:{layout:"centered"},title:"Design system/Forms/Input"},{Story:g}=G();var F=_("<!> <!> <!> <!> <!>",1);function u(p,m){y(m,!1),b(),g(p,{asChild:!0,name:"Default",children:($,E)=>{D($,{columns:2,children:(c,R)=>{var s=F(),o=I(s);l(o,{label:"Empty",children:(e,a)=>{t(e,{placeholder:"http://localhost:8080"})},$$slots:{default:!0}});var n=r(o,2);l(n,{label:"Filled",children:(e,a)=>{t(e,{value:"http://localhost:8080"})},$$slots:{default:!0}});var i=r(n,2);l(i,{label:"Invalid",children:(e,a)=>{t(e,{"aria-invalid":"true",value:"not a url"})},$$slots:{default:!0}});var d=r(i,2);l(d,{label:"Disabled",children:(e,a)=>{t(e,{disabled:!0,value:"Read only"})},$$slots:{default:!0}});var f=r(d,2);l(f,{label:"File",children:(e,a)=>{t(e,{type:"file"})},$$slots:{default:!0}}),h(c,s)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2}>
	<StateGalleryItem label="Empty">
		<Input placeholder="http://localhost:8080" />
	</StateGalleryItem>

	<StateGalleryItem label="Filled">
		<Input value="http://localhost:8080" />
	</StateGalleryItem>

	<StateGalleryItem label="Invalid">
		<Input aria-invalid="true" value="not a url" />
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<Input disabled value="Read only" />
	</StateGalleryItem>

	<StateGalleryItem label="File">
		<Input type="file" />
	</StateGalleryItem>
</StateGallery>`}}}),v()}u.__docgen={data:[],name:"Input.stories.svelte"};const C=S(u,P),z=["Default"],A={...C.Default,tags:["svelte-csf-v5"]};export{A as Default,z as __namedExportsOrder,P as default};
