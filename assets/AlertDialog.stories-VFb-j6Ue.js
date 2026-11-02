import{p as w,f as i,s as d,m as a,a as e,a3 as F,d as H,e as h,b as O}from"./iframe-BxvSZK0j.js";import{c as S,i as E,d as M}from"./create-runtime-stories-DF7OwIoM.js";import{R as P,A as j,a as k,b as q,c as z,d as G,e as I,f as J,g as K}from"./index-C9PbKOs8.js";import{B as L}from"./button-xywSqPau.js";import"./preload-helper-PPVm8Dsz.js";import"./dialog-description-D6Mb1Tvy.js";import"./this-PF-vsikk.js";const N={component:P,parameters:{layout:"fullscreen"},title:"Design system/Overlays/AlertDialog"},{Story:Q}=M();var c=h("<!> <!>",1),U=h('<div class="grid h-screen place-items-center"><!></div>');function C(x,b){w(b,!1),E(),Q(x,{asChild:!0,name:"Default",children:(T,W)=>{var v=U(),R=O(v);P(R,{open:!0,children:(y,X)=>{var f=c(),m=i(f);j(m,{child:(A,s)=>{L(A,F(()=>s?.().props,{variant:"destructive",children:(_,n)=>{var g=a("Delete conversation");e(_,g)},$$slots:{default:!0}}))},$$slots:{child:!0}});var B=d(m,2);k(B,{children:(D,A)=>{var s=c(),p=i(s);q(p,{children:(n,g)=>{var o=c(),l=i(o);z(l,{children:(t,u)=>{var r=a("Delete this conversation?");e(t,r)},$$slots:{default:!0}});var $=d(l,2);G($,{children:(t,u)=>{var r=a("All of its messages are removed from this browser. This cannot be undone.");e(t,r)},$$slots:{default:!0}}),e(n,o)},$$slots:{default:!0}});var _=d(p,2);I(_,{children:(n,g)=>{var o=c(),l=i(o);J(l,{children:(t,u)=>{var r=a("Cancel");e(t,r)},$$slots:{default:!0}});var $=d(l,2);K($,{children:(t,u)=>{var r=a("Delete");e(t,r)},$$slots:{default:!0}}),e(n,o)},$$slots:{default:!0}}),e(D,s)},$$slots:{default:!0}}),e(y,f)},$$slots:{default:!0}}),e(T,v)},$$slots:{default:!0},parameters:{__svelteCsf:{rawCode:`<div class="grid h-screen place-items-center">
	<AlertDialog.Root open>
		<AlertDialog.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="destructive">Delete conversation</Button>
			{/snippet}
		</AlertDialog.Trigger>

		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete this conversation?</AlertDialog.Title>

				<AlertDialog.Description>
					All of its messages are removed from this browser. This cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>

			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>

				<AlertDialog.Action>Delete</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
</div>`}}}),H()}C.__docgen={data:[],name:"AlertDialog.stories.svelte"};const V=S(C,N),ae=["Default"],se={...V.Default,tags:["svelte-csf-v5"]};export{se as Default,ae as __namedExportsOrder,N as default};
