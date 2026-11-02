import{p as O,f as v,m as o,a as e,s as n,b as j,d as q,e as g,g as D}from"./iframe-BxvSZK0j.js";import{c as z,i as A,d as B}from"./create-runtime-stories-DF7OwIoM.js";import{S as H,a as d}from"./StateGalleryItem-BMGszy9q.js";import{R as i,S as $,a as J,b as K,c as N,d as Q}from"./index-CDO0wwOG.js";import{e as U}from"./each-DMxlN0HO.js";import"./preload-helper-PPVm8Dsz.js";import"./mounted-DosV_eyV.js";import"./chevron-down-D7MPUDbV.js";import"./Icon-CSRBsjq8.js";import"./svelte-element-BAftWIbD.js";import"./check-DMUsyudZ.js";import"./this-PF-vsikk.js";import"./separator-DEWw0QPu.js";import"./floating-layer-anchor-DpndBh7P.js";import"./hidden-input-01vZpQIL.js";import"./input-BVFa53i-.js";const V={component:i,parameters:{layout:"centered"},title:"Design system/Forms/Select"},{Story:X}=B(),Y=[{label:"System",value:"system"},{label:"Light",value:"light"},{label:"Dark",value:"dark"}];var R=g("<!> <!>",1),Z=g('<div class="h-48"><!></div>'),ee=g("<!> <!> <!> <!>",1);function T(w,k){O(k,!1),A(),X(w,{asChild:!0,name:"Default",children:(x,le)=>{H(x,{columns:3,minItemWidth:"12rem",children:(C,ae)=>{var f=ee(),_=v(f);d(_,{label:"Placeholder",children:(a,m)=>{i(a,{type:"single",children:(t,c)=>{$(t,{class:"w-44",children:(s,u)=>{var l=o("Choose a theme");e(s,l)},$$slots:{default:!0}})},$$slots:{default:!0}})},$$slots:{default:!0}});var y=n(_,2);d(y,{label:"Selected",children:(a,m)=>{i(a,{type:"single",value:"dark",children:(t,c)=>{$(t,{class:"w-44",children:(s,u)=>{var l=o("Dark");e(s,l)},$$slots:{default:!0}})},$$slots:{default:!0}})},$$slots:{default:!0}});var b=n(y,2);d(b,{label:"Disabled",children:(a,m)=>{i(a,{disabled:!0,type:"single",value:"system",children:(t,c)=>{$(t,{class:"w-44",children:(s,u)=>{var l=o("System");e(s,l)},$$slots:{default:!0}})},$$slots:{default:!0}})},$$slots:{default:!0}});var L=n(b,2);d(L,{label:"With options",note:"click to open the list",span:3,children:(a,m)=>{var t=Z(),c=j(t);i(c,{type:"single",value:"light",children:(s,u)=>{var l=R(),P=v(l);$(P,{class:"w-44",children:(p,E)=>{var h=o("Light");e(p,h)},$$slots:{default:!0}});var W=n(P,2);J(W,{children:(p,E)=>{K(p,{children:(h,se)=>{var G=R(),I=v(G);N(I,{children:(r,S)=>{var M=o("Theme");e(r,M)},$$slots:{default:!0}});var F=n(I,2);U(F,1,()=>Y,r=>r.value,(r,S)=>{Q(r,{get label(){return D(S).label},get value(){return D(S).value}})}),e(h,G)},$$slots:{default:!0}})},$$slots:{default:!0}}),e(s,l)},$$slots:{default:!0}}),e(a,t)},$$slots:{default:!0}}),e(C,f)},$$slots:{default:!0}})},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<StateGallery columns={3} minItemWidth="12rem">
	<StateGalleryItem label="Placeholder">
		<Select.Root type="single">
			<Select.Trigger class="w-44">Choose a theme</Select.Trigger>
		</Select.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Selected">
		<Select.Root type="single" value="dark">
			<Select.Trigger class="w-44">Dark</Select.Trigger>
		</Select.Root>
	</StateGalleryItem>

	<StateGalleryItem label="Disabled">
		<Select.Root disabled type="single" value="system">
			<Select.Trigger class="w-44">System</Select.Trigger>
		</Select.Root>
	</StateGalleryItem>

	<StateGalleryItem label="With options" note="click to open the list" span={3}>
		<div class="h-48">
			<Select.Root type="single" value="light">
				<Select.Trigger class="w-44">Light</Select.Trigger>

				<Select.Content>
					<Select.Group>
						<Select.Label>Theme</Select.Label>

						{#each themes as theme (theme.value)}
							<Select.Item label={theme.label} value={theme.value} />
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
	</StateGalleryItem>
</StateGallery>`}}}),q()}T.__docgen={data:[],name:"Select.stories.svelte"};const te=z(T,V),ye=["Default"],be={...te.Default,tags:["svelte-csf-v5"]};export{be as Default,ye as __namedExportsOrder,V as default};
