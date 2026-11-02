import{a3 as z,w as P,p as j,f as B,s as t,a as n,b as I,m as b,d as k,e as x}from"./iframe-BxvSZK0j.js";import{c as q,i as F,d as J}from"./create-runtime-stories-DF7OwIoM.js";import{S as K,a as m}from"./StateGalleryItem-BMGszy9q.js";import{B as S}from"./button-xywSqPau.js";import{T as a}from"./toggle-BbwUMDz5.js";import{I as G}from"./Icon-CSRBsjq8.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";var L=new Set(["$$slots","$$events","$$legacy"]);function T($,u){let c=P(u,L);const v={name:"bold",size:24,node:[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"}]]};G($,z(()=>c,{get icon(){return v}}))}var Q=new Set(["$$slots","$$events","$$legacy"]);function H($,u){let c=P(u,Q);const v={name:"italic",size:24,node:[["line",{x1:"19",x2:"10",y1:"4",y2:"4"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20"}]]};G($,z(()=>c,{get icon(){return v}}))}var U=new Set(["$$slots","$$events","$$legacy"]);function N($,u){let c=P(u,U);const v={name:"text-wrap",size:24,node:[["path",{d:"m16 16-3 3 3 3"}],["path",{d:"M3 12h14.5a1 1 0 0 1 0 7H13"}],["path",{d:"M3 19h6"}],["path",{d:"M3 5h18"}]],aliases:["wrap-text"]};G($,z(()=>c,{get icon(){return v}}))}const X={component:a,parameters:{layout:"centered"},title:"Design system/Actions/Toggle"},{Story:Y}=J();var Z=x('<div class="flex gap-2"><!> <!></div>'),ee=x('<div class="flex items-center gap-2"><!> <!> <!></div>'),A=x("<!> Wrap",1),te=x('<div class="flex items-center gap-2"><!> <!> <!> <!> <!> <!></div>'),ae=x("<!> <!> <!> <!> <!> <!>",1);function E($,u){j(u,!1),F(),Y($,{asChild:!0,name:"Default",children:(c,v)=>{K(c,{columns:4,minItemWidth:"10rem",children:(R,oe)=>{var W=ae(),D=B(W);m(D,{label:"Off",children:(l,f)=>{a(l,{"aria-label":"Bold",size:"icon",children:(e,o)=>{T(e,{})},$$slots:{default:!0}})},$$slots:{default:!0}});var w=t(D,2);m(w,{label:"On",children:(l,f)=>{a(l,{"aria-label":"Bold",pressed:!0,size:"icon",children:(e,o)=>{T(e,{})},$$slots:{default:!0}})},$$slots:{default:!0}});var O=t(w,2);m(O,{label:"Outline",children:(l,f)=>{var e=Z(),o=I(e);a(o,{"aria-label":"Italic",size:"icon",variant:"outline",children:(d,s)=>{H(d,{})},$$slots:{default:!0}});var p=t(o,2);a(p,{"aria-label":"Italic",pressed:!0,size:"icon",variant:"outline",children:(d,s)=>{H(d,{})},$$slots:{default:!0}}),n(l,e)},$$slots:{default:!0}});var M=t(O,2);m(M,{label:"Sizes",note:"sm, default, lg",children:(l,f)=>{var e=ee(),o=I(e);a(o,{size:"sm",variant:"outline",children:(s,_)=>{var g=b("Wrap");n(s,g)},$$slots:{default:!0}});var p=t(o,2);a(p,{variant:"outline",children:(s,_)=>{var g=b("Wrap");n(s,g)},$$slots:{default:!0}});var d=t(p,2);a(d,{size:"lg",variant:"outline",children:(s,_)=>{var g=b("Wrap");n(s,g)},$$slots:{default:!0}}),n(l,e)},$$slots:{default:!0}});var C=t(M,2);m(C,{label:"Disabled",children:(l,f)=>{a(l,{"aria-label":"Bold",disabled:!0,size:"icon",children:(e,o)=>{T(e,{})},$$slots:{default:!0}})},$$slots:{default:!0}});var V=t(C,2);m(V,{label:"Next to Button",note:"same height, padding and corners",span:3,children:(l,f)=>{var e=te(),o=I(e);S(o,{variant:"outline",children:(r,h)=>{var i=b("Button");n(r,i)},$$slots:{default:!0}});var p=t(o,2);a(p,{variant:"outline",children:(r,h)=>{var i=b("Toggle");n(r,i)},$$slots:{default:!0}});var d=t(p,2);S(d,{variant:"outline",children:(r,h)=>{var i=A(),y=B(i);N(y,{}),n(r,i)},$$slots:{default:!0}});var s=t(d,2);a(s,{pressed:!0,variant:"outline",children:(r,h)=>{var i=A(),y=B(i);N(y,{}),n(r,i)},$$slots:{default:!0}});var _=t(s,2);S(_,{"aria-label":"Bold",size:"icon",variant:"outline",children:(r,h)=>{T(r,{})},$$slots:{default:!0}});var g=t(_,2);a(g,{"aria-label":"Bold",size:"icon",variant:"outline",children:(r,h)=>{T(r,{})},$$slots:{default:!0}}),n(l,e)},$$slots:{default:!0}}),n(R,W)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={4} minItemWidth="10rem">
	<StateGalleryItem label="Off">
		<Toggle aria-label="Bold" size="icon"><Bold /></Toggle>
	</StateGalleryItem>

	<StateGalleryItem label="On">
		<Toggle aria-label="Bold" pressed size="icon"><Bold /></Toggle>
	</StateGalleryItem>

	<StateGalleryItem label="Outline">
		<div class="flex gap-2">
			<Toggle aria-label="Italic" size="icon" variant="outline"><Italic /></Toggle>

			<Toggle aria-label="Italic" pressed size="icon" variant="outline"><Italic /></Toggle>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="Sizes" note="sm, default, lg">
		<div class="flex items-center gap-2">
			<Toggle size="sm" variant="outline">Wrap</Toggle>

			<Toggle variant="outline">Wrap</Toggle>

			<Toggle size="lg" variant="outline">Wrap</Toggle>
		</div>
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<Toggle aria-label="Bold" disabled size="icon"><Bold /></Toggle>
	</StateGalleryItem>

	<StateGalleryItem label="Next to Button" note="same height, padding and corners" span={3}>
		<div class="flex items-center gap-2">
			<Button variant="outline">Button</Button>

			<Toggle variant="outline">Toggle</Toggle>

			<Button variant="outline"><WrapText /> Wrap</Button>

			<Toggle pressed variant="outline"><WrapText /> Wrap</Toggle>

			<Button aria-label="Bold" size="icon" variant="outline"><Bold /></Button>

			<Toggle aria-label="Bold" size="icon" variant="outline"><Bold /></Toggle>
		</div>
	</StateGalleryItem>
</StateGallery>`}}}),k()}E.__docgen={data:[],name:"Toggle.stories.svelte"};const le=q(E,X),ve=["Default"],me={...le.Default,tags:["svelte-csf-v5"]};export{me as Default,ve as __namedExportsOrder,X as default};
