import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { height } = Dimensions.get('window');

// AJUSTE AQUI SEU IP LOCAL PARA TESTES (Não use localhost se estiver no device/emulador android)
const API_URL = 'http://localhost:3000'; // Exemplo: http://192.168.0.15:3000

const InterfaceDocente = () => {
  const navigation = useNavigation();

  // Estados para dados da API
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [alocacoes, setAlocacoes] = useState([]);

  // Estados do formulário
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [etapaSelecionada, setEtapaSelecionada] = useState('');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('');

  // Estados de UI
  const [telaAtiva, setTelaAtiva] = useState('Inicio');
  const [footerExpanded, setFooterExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Buscar dados do usuário logado (Simulação de sessão)
        const userResponse = await fetch(`${API_URL}/turmas/usuario-logado`);
        const userData = await userResponse.json();
        setUserInfo(userData);

        // 2. Buscar lista de alocações (Turmas e Disciplinas do professor)
        const turmasResponse = await fetch(`${API_URL}/turmas`);
        const turmasData = await turmasResponse.json();
        setAlocacoes(turmasData);

      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar os dados. Verifique sua conexão com o backend.");
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- LOGICA DE FILTROS (DERIVED STATE) ---

  // 1. Lista única de turmas para o Picker
  const turmasOpcoes = useMemo(() => {
    // Cria um Set para garantir nomes únicos de turmas
    const nomesUnicos = [...new Set(alocacoes.map(a => a.nome_turma))];
    return nomesUnicos.sort();
  }, [alocacoes]);

  // 2. Lista de disciplinas (filtrada pela turma selecionada para melhor UX)
  const disciplinasOpcoes = useMemo(() => {
    if (!turmaSelecionada) {
      // Se nenhuma turma selecionada, mostra todas as disciplinas únicas do professor
      return [...new Set(alocacoes.map(a => a.nome_disciplina))].sort();
    }
    // Se tem turma selecionada, mostra só as disciplinas daquela turma
    return alocacoes
      .filter(a => a.nome_turma === turmaSelecionada)
      .map(a => a.nome_disciplina)
      .sort();
  }, [alocacoes, turmaSelecionada]);


  // --- AÇÕES ---

  const handlePesquisar = () => {
    if (!turmaSelecionada || !disciplinaSelecionada || !etapaSelecionada) {
      Alert.alert("Atenção", "Por favor, selecione Turma, Etapa e Disciplina.");
      return;
    }

    // Encontrar o ID da alocação correspondente à combinação Turma + Disciplina
    const alocacaoEncontrada = alocacoes.find(
      a => a.nome_turma === turmaSelecionada && a.nome_disciplina === disciplinaSelecionada
    );

    if (alocacaoEncontrada) {
      navigation.navigate('RegistroPresenca', {
        idAlocacao: alocacaoEncontrada.id_alocacao, // Passamos o ID vital para a próxima tela
        turma: turmaSelecionada,
        etapa: etapaSelecionada,
        disciplina: disciplinaSelecionada,
        // Passamos também dados extras se precisar exibir na próxima tela
        anoEscolar: alocacaoEncontrada.ano_escolar
      });
    } else {
      Alert.alert("Erro", "Combinação de Turma e Disciplina não encontrada.");
    }
  };

  const toggleFooter = () => {
    setFooterExpanded((prev) => !prev);
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0E0E2C'}}>
        <ActivityIndicator size="large" color="#F9DC5C" />
        <Text style={{color: '#FFF', marginTop: 10}}>Carregando Diário...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: footerExpanded ? height * 0.4 : 200 }]}>
        <View style={styles.header}>
          {/* DADOS VINDOS DO BACKEND (usuario-logado) */}
          <Text style={styles.greeting}>
            Olá, {userInfo?.docente?.nome || 'Docente'}!
          </Text>
          <Text style={styles.schoolYear}>
            {userInfo?.periodoLetivo?.descricao || 'Ano Letivo'}
          </Text>
          <Text style={styles.schoolName}>
            {userInfo?.unidadeEnsino?.nome || 'Diário Eletrônico'}
          </Text>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Filtro</Text>

          {/* PICKER DE TURMA DINÂMICO */}
          <View style={styles.filterItemVertical}>
            <Text style={styles.filterLabel}>Turma</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={turmaSelecionada}
                onValueChange={(itemValue) => {
                  setTurmaSelecionada(itemValue);
                  // Limpa disciplina se mudar a turma para evitar combinações inválidas
                  setDisciplinaSelecionada('');
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Selecione a Turma" value="" color="#999" />
                {turmasOpcoes.map((turmaNome, index) => (
                  <Picker.Item key={index} label={turmaNome} value={turmaNome} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.filterItemVertical}>
            <Text style={styles.filterLabel}>Etapa Bimestral</Text>
            {/* Etapas continuam hardcoded pois o backend (listar turmas) não fornece isso,
                mas é necessário para o filtro de presença depois */}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={etapaSelecionada}
                onValueChange={setEtapaSelecionada}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Selecione a Etapa" value="" color="#999" />
                <Picker.Item label="1º Bimestre" value="1bimestre" />
                <Picker.Item label="2º Bimestre" value="2bimestre" />
                <Picker.Item label="3º Bimestre" value="3bimestre" />
                <Picker.Item label="4º Bimestre" value="4bimestre" />
              </Picker>
            </View>
          </View>

          {/* PICKER DE DISCIPLINA DINÂMICO */}
          <View style={styles.filterItemVertical}>
            <Text style={styles.filterLabel}>Disciplina</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={disciplinaSelecionada}
                enabled={!!turmaSelecionada} // Desabilita se não tiver turma selecionada
                onValueChange={setDisciplinaSelecionada}
                style={[styles.picker, !turmaSelecionada && styles.pickerDisabled]}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label={turmaSelecionada ? "Selecione a Disciplina" : "Selecione a Turma primeiro"} value="" color="#999" />
                {disciplinasOpcoes.map((discNome, index) => (
                  <Picker.Item key={index} label={discNome} value={discNome} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handlePesquisar}>
            <Text style={styles.searchButtonText}>Pesquisar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER MANTIDO IGUAL */}
      <View style={[styles.footerContainer, footerExpanded && styles.footerContainerExpanded]}>
        <View style={styles.footer}>
          <TouchableOpacity onPress={toggleFooter} style={styles.footerButton}>
            <Ionicons
              name={footerExpanded ? 'chevron-down-outline' : 'chevron-up-outline'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.footerButtonText}>
              {footerExpanded ? 'Fechar' : 'Mais'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Notas')} style={styles.footerButton}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={telaAtiva === 'Notas' ? '#F9DC5C' : '#FFFFFF'}
           />
          <Text style={[styles.footerButtonText, telaAtiva === 'Notas' && styles.activeFooterButtonText]}> Notas</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setTelaAtiva('Relatorio')} style={styles.footerButton}>
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={telaAtiva === 'Relatorio' ? '#F9DC5C' : '#FFFFFF'}
            />
            <Text style={[styles.footerButtonText, telaAtiva === 'Relatorio' && styles.activeFooterButtonText]}>Relatório</Text>
          </TouchableOpacity>
        </View>

        {footerExpanded && (
          <View style={styles.additionalOptions}>
            <TouchableOpacity style={styles.expandedOption}>
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
              <Text style={styles.expandedOptionText}>Registrar Aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandedOption} onPress={() => navigation.navigate('RegistroPresenca')}>
              <Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" />
              <Text style={styles.expandedOptionText}>Registrar Presença</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandedOption} onPress={() => navigation.navigate('RegistroOcorrencia')}>
              <Ionicons name="warning-outline" size={24} color="#FFFFFF" />
              <Text style={styles.expandedOptionText}>Ocorrências</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandedOption} onPress={() => navigation.navigate('Agenda')}>
              <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
              <Text style={styles.expandedOptionText}>Agenda</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { alignItems: 'center' },
  header: {
    backgroundColor: '#0E0E2C',
    width: '100%',
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 20 },
  schoolYear: { fontSize: 16, color: '#ADB5BD', marginTop: 5 },
  schoolName: { fontSize: 16, fontWeight: 'bold', color: '#F9DC5C', marginTop: 5, textAlign: 'center', paddingHorizontal: 10 },
  filterContainer: {
    marginTop: -height * 0.08,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    width: '90%',
    padding: 15,
    // Sombra leve para destacar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  filterItemVertical: { marginBottom: 15 },
  filterLabel: { fontSize: 14, marginBottom: 5, color: '#333', fontWeight: '500' },
  // Adicionei um container para o picker para melhor controle de borda em alguns androids
  pickerContainer: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    overflow: 'hidden', // Ajuda a conter o picker nativo
  },
  picker: {
    height: Platform.OS === 'android' ? 50 : undefined, // Altura fixa ajuda no Android
    width: '100%',
  },
  pickerDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.7
  },
  pickerItem: {
    fontSize: 14, // Reduzi levemente para caber nomes maiores de turmas
  },
  searchButton: {
    backgroundColor: '#0E0E2C',
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'stretch', // Botão largura total fica melhor
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  footerContainer: {
    backgroundColor: '#0E0E2C',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 20 : 30, // Ajuste leve no padding
    paddingHorizontal: 10,
  },
  footerContainerExpanded: {
    minHeight: height * 0.35,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-around' },
  footerButton: { alignItems: 'center', minWidth: 60 }, // MinWidth ajuda no toque
  footerButtonText: { color: '#FFFFFF', fontSize: 12, marginTop: 5 },
  activeFooterButtonText: { color: '#F9DC5C', fontWeight: 'bold' },
  additionalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  expandedOption: {
    alignItems: 'center',
    margin: 10,
    width: '40%',
  },
  expandedOptionText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 3,
    textAlign: 'center',
  },
});

export default InterfaceDocente;