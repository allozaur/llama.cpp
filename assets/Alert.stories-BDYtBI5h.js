import{p as w,f as c,s,m,a as t,d as R,e as P}from"./iframe-BxvSZK0j.js";import{c as M,i as k,d as W}from"./create-runtime-stories-DF7OwIoM.js";import{S as E,a as u}from"./StateGalleryItem-BMGszy9q.js";import{A as f,a as p,b as D}from"./alert-title-DFRtSKPR.js";import{I,C as O}from"./info-Cb5cGIZT.js";import"./preload-helper-PPVm8Dsz.js";import"./this-PF-vsikk.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";const j={component:f,parameters:{layout:"centered"},title:"Design system/Display/Alert"},{Story:q}=W();var _=P("<!> <!> <!>",1),z=P("<!> <!>",1);function b(g,x){w(x,!1),k(),q(g,{asChild:!0,name:"Default",children:(G,F)=>{E(G,{columns:2,minItemWidth:"20rem",children:(T,H)=>{var v=_(),h=c(v);u(h,{label:"Default",children:(n,y)=>{f(n,{children:(i,S)=>{var e=_(),r=c(e);I(r,{});var a=s(r,2);p(a,{children:(l,$)=>{var o=m("Model is loading");t(l,o)},$$slots:{default:!0}});var d=s(a,2);D(d,{children:(l,$)=>{var o=m("The first reply can take a few seconds.");t(l,o)},$$slots:{default:!0}}),t(i,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var A=s(h,2);u(A,{label:"Destructive",children:(n,y)=>{f(n,{variant:"destructive",children:(i,S)=>{var e=_(),r=c(e);O(r,{});var a=s(r,2);p(a,{children:(l,$)=>{var o=m("Context is full");t(l,o)},$$slots:{default:!0}});var d=s(a,2);D(d,{children:(l,$)=>{var o=m("Start a new chat or remove some attachments.");t(l,o)},$$slots:{default:!0}}),t(i,e)},$$slots:{default:!0}})},$$slots:{default:!0}});var C=s(A,2);u(C,{label:"Title only",children:(n,y)=>{f(n,{children:(i,S)=>{var e=z(),r=c(e);I(r,{});var a=s(r,2);p(a,{children:(d,l)=>{var $=m("Saved to this browser");t(d,$)},$$slots:{default:!0}}),t(i,e)},$$slots:{default:!0}})},$$slots:{default:!0}}),t(T,v)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2} minItemWidth="20rem">
	<StateGalleryItem label="Default">
		<Alert.Root>
			<Info />

			<Alert.Title>Model is loading</Alert.Title>

			<Alert.Description>The first reply can take a few seconds.</Alert.Description>
		</Alert.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Destructive">
		<Alert.Root variant="destructive">
			<CircleAlert />

			<Alert.Title>Context is full</Alert.Title>

			<Alert.Description>Start a new chat or remove some attachments.</Alert.Description>
		</Alert.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Title only">
		<Alert.Root>
			<Info />

			<Alert.Title>Saved to this browser</Alert.Title>
		</Alert.Root>
	</StateGalleryItem>
</StateGallery>`}}}),R()}b.__docgen={data:[],name:"Alert.stories.svelte"};const B=M(b,j),tt=["Default"],et={...B.Default,tags:["svelte-csf-v5"]};export{et as Default,tt as __namedExportsOrder,j as default};
