import{p as M,f as s,c as v,a as l,s as c,d as O,e as x,g as n,t as h,h as g}from"./iframe-BxvSZK0j.js";import{c as j,i as q,d as z}from"./create-runtime-stories-DF7OwIoM.js";import{S as A,a as G}from"./StateGalleryItem-BMGszy9q.js";import{L as R}from"./label-2OikHIdw.js";import{R as f,a as b}from"./radio-group-item-BtppKCUx.js";import{e as y}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";import"./hidden-input-01vZpQIL.js";import"./input-BVFa53i-.js";import"./circle-DEMsv9Zq.js";import"./Icon-CSRBsjq8.js";import"./svelte-element-BAftWIbD.js";const B={component:f,parameters:{layout:"centered"},title:"Design system/Forms/RadioGroup"},{Story:H}=z(),S=["System","Light","Dark"];var D=x("<!> ",1),J=x("<!> <!>",1);function I(P,L){M(L,!1),q(),H(P,{asChild:!0,name:"Default",children:(k,N)=>{A(k,{columns:2,minItemWidth:"12rem",children:(C,Q)=>{var $=J(),_=s($);G(_,{label:"Enabled",children:(i,W)=>{f(i,{value:"System",children:(m,w)=>{var t=v(),d=s(t);y(d,1,()=>S,e=>e,(e,a)=>{R(e,{class:"flex items-center gap-2",children:(p,F)=>{var o=D(),r=s(o);b(r,{get value(){return n(a)}});var u=c(r);h(()=>g(u,` ${n(a)??""}`)),l(p,o)},$$slots:{default:!0}})}),l(m,t)},$$slots:{default:!0}})},$$slots:{default:!0}});var E=c(_,2);G(E,{label:"Disabled",children:(i,W)=>{f(i,{disabled:!0,value:"Dark",children:(m,w)=>{var t=v(),d=s(t);y(d,1,()=>S,e=>e,(e,a)=>{R(e,{class:"flex items-center gap-2",children:(p,F)=>{var o=D(),r=s(o);b(r,{get value(){return n(a)}});var u=c(r);h(()=>g(u,` ${n(a)??""}`)),l(p,o)},$$slots:{default:!0}})}),l(m,t)},$$slots:{default:!0}})},$$slots:{default:!0}}),l(C,$)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={2} minItemWidth="12rem">
	<StateGalleryItem label="Enabled">
		<RadioGroup.Root value="System">
			{#each options as option (option)}
				<Label class="flex items-center gap-2">
					<RadioGroup.Item value={option} />
					{option}
				</Label>
			{/each}
		</RadioGroup.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<RadioGroup.Root disabled value="Dark">
			{#each options as option (option)}
				<Label class="flex items-center gap-2">
					<RadioGroup.Item value={option} />
					{option}
				</Label>
			{/each}
		</RadioGroup.Root>
	</StateGalleryItem>
</StateGallery>`}}}),O()}I.__docgen={data:[],name:"RadioGroup.stories.svelte"};const K=j(I,B),le=["Default"],ne={...K.Default,tags:["svelte-csf-v5"]};export{ne as Default,le as __namedExportsOrder,B as default};
