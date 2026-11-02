import{p as h,f as $,s as o,a as f,d as _,e as v}from"./iframe-BxvSZK0j.js";import{c as y,i as C,d as G}from"./create-runtime-stories-DF7OwIoM.js";import{S as I,a}from"./StateGalleryItem-BMGszy9q.js";import{C as t}from"./ChatFormActionSubmit-JvGaFQpW.js";import"./preload-helper-PPVm8Dsz.js";import"./button-xywSqPau.js";import"./this-PF-vsikk.js";import"./Icon-CSRBsjq8.js";import"./each-DMxlN0HO.js";import"./svelte-element-BAftWIbD.js";const F={component:t,parameters:{layout:"centered"},title:"Chat/ChatScreen/ChatForm/ChatFormActionSubmit"},{Story:A}=G();var P=v("<!> <!> <!> <!> <!>",1);function d(c,S){h(S,!1),C(),A(c,{asChild:!0,name:"States",children:(p,g)=>{I(p,{columns:5,children:(u,L)=>{var n=P(),r=$(n);a(r,{label:"Empty",note:"nothing to send",children:(e,l)=>{t(e,{canSend:!1})},$$slots:{default:!0}});var s=o(r,2);a(s,{label:"Enabled",children:(e,l)=>{t(e,{canSend:!0})},$$slots:{default:!0}});var i=o(s,2);a(i,{label:"Disabled",children:(e,l)=>{t(e,{canSend:!0,disabled:!0})},$$slots:{default:!0}});var m=o(i,2);a(m,{label:"No model",note:"tooltip on hover",children:(e,l)=>{t(e,{canSend:!1,tooltipLabel:"Please select a model first"})},$$slots:{default:!0}});var b=o(m,2);a(b,{label:"Unavailable",note:"error, tooltip on hover",children:(e,l)=>{t(e,{canSend:!1,showErrorState:!0,tooltipLabel:"Selected model is not available, please select another"})},$$slots:{default:!0}}),f(u,n)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={5}>
	<StateGalleryItem label="Empty" note="nothing to send">
		<ChatFormActionSubmit canSend={false} />
	</StateGalleryItem>

	<StateGalleryItem label="Enabled">
		<ChatFormActionSubmit canSend />
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<ChatFormActionSubmit canSend disabled />
	</StateGalleryItem>

	<StateGalleryItem label="No model" note="tooltip on hover">
		<ChatFormActionSubmit canSend={false} tooltipLabel="Please select a model first" />
	</StateGalleryItem>

	<StateGalleryItem label="Unavailable" note="error, tooltip on hover">
		<ChatFormActionSubmit
			canSend={false}
			showErrorState
			tooltipLabel="Selected model is not available, please select another"
		/>
	</StateGalleryItem>
</StateGallery>`}}}),_()}d.__docgen={data:[],name:"ChatFormActionSubmit.stories.svelte"};const E=y(d,F),q=["States"],z={...E.States,tags:["svelte-csf-v5"]};export{z as States,q as __namedExportsOrder,F as default};
