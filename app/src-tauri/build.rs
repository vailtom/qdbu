/*
 * build.rs -- carimba no binario a versao de exibicao e a data de linkedicao.
 *
 * A convencao e a do Clipper, e e deliberada: a versao e um par `NN.NN` e a
 * data de linkedicao anda junto dela. O par sozinho nao distingue duas
 * compilacoes do mesmo dia de trabalho; a data sozinha nao diz qual release
 * aquilo e. Sao os dois, sempre, e por isso saem juntos daqui.
 *
 * FONTE UNICA: os dois numeros vem de `[package] version` do Cargo.toml, que
 * ja e a versao do produto. Nao ha um segundo lugar para esquecer de atualizar.
 * O `patch` do semver nao entra no par -- quem distingue duas compilacoes do
 * mesmo NN.NN e a data, que e mais informativa que um terceiro numero.
 *
 * NAO ha `cargo:rerun-if-changed` aqui, de proposito. Sem ele o cargo reexecuta
 * este script sempre que qualquer arquivo do pacote muda -- ou seja, sempre que
 * um binario NOVO e produzido. Quando nada mudou nao ha binario novo, e o
 * carimbo antigo continua descrevendo com exatidao o executavel que existe no
 * disco. Uma data que se atualizasse sozinha sem recompilar e que estaria
 * mentindo.
 */
fn main() {
    let major: u32 = std::env::var("CARGO_PKG_VERSION_MAJOR")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);
    let minor: u32 = std::env::var("CARGO_PKG_VERSION_MINOR")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0);

    /*
     * O MAIOR NAO LEVA ZERO A ESQUERDA, e o menor leva.
     *
     * `00.76` foi invencao nossa: o Clipper escrevia `5.2e` e `5.3a`, nunca
     * `05.02` -- o que e heranca dele e o PAR (versao mais data de
     * linkedicao), nao o preenchimento. E o zero criava tres grafias para o
     * mesmo binario: `00.76` na janela, `0.76.0` no pacote e `v0.76.0` na
     * tag. Quem baixava `qdbu-0.76.0.zip` e lia `v00.76` no titulo tinha
     * motivo para achar que pegou outra coisa.
     *
     * O menor CONTINUA com dois digitos porque e um contador de dois digitos
     * neste projeto -- 01, 75, 76 --, e `0.8` depois de `0.76` leria como
     * salto para tras.
     */
    println!("cargo:rustc-env=QDBU_VERSAO={major}.{minor:02}");

    // Hora LOCAL, nao UTC: quem le "compilado em" quer a hora do relogio da
    // maquina que compilou, que e a referencia com que a pessoa se lembra do
    // que estava fazendo. UTC exigiria uma conversao mental para servir ao
    // mesmo fim.
    println!(
        "cargo:rustc-env=QDBU_COMPILADO={}",
        chrono::Local::now().format("%Y-%m-%d %H:%M")
    );

    tauri_build::build()
}
