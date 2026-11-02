import{p as $,c as _,f as g,a as s,d as v,m as h,g as r}from"./iframe-BxvSZK0j.js";import{c as y,i as S,d as B}from"./create-runtime-stories-DF7OwIoM.js";import{S as D,a as G}from"./StateGalleryItem-BMGszy9q.js";import{B as l}from"./badge-Cdt4ydpE.js";import{e as I}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";import"./svelte-element-BAftWIbD.js";import"./this-PF-vsikk.js";const x={component:l,parameters:{layout:"centered"},title:"Design system/Display/Badge"},{Story:P}=B(),C=["default","secondary","outline","destructive"];function o(n,i){$(i,!1),S(),P(n,{asChild:!0,name:"Default",children:(m,b)=>{D(m,{columns:4,minItemWidth:"8rem",children:(d,K)=>{var e=_(),c=g(e);I(c,1,()=>C,t=>t,(t,a)=>{G(t,{get label(){return r(a)},children:(u,Q)=>{l(u,{get variant(){return r(a)},children:(f,W)=>{var p=h("Q4_K_M");s(f,p)},$$slots:{default:!0}})},$$slots:{default:!0}})}),s(d,e)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={4} minItemWidth="8rem">
	{#each variants as variant (variant)}
		<StateGalleryItem label={variant}>
			<Badge {variant}>Q4_K_M</Badge>
		</StateGalleryItem>
	{/each}
</StateGallery>`}}}),v()}o.__docgen={data:[],name:"Badge.stories.svelte"};const M=y(o,x),A=["Default"],F={...M.Default,tags:["svelte-csf-v5"]};export{F as Default,A as __namedExportsOrder,x as default};
